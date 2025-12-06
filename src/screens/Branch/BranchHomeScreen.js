// src/screens/Branch/BranchHomeScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../lib/supabaseClient";
import Sound from 'react-native-sound';
import { SafeAreaView } from "react-native-safe-area-context";

export default function BranchHomeScreen({ route, navigation }) {
  const branchId = route.params.branchId;

  const [branchName, setBranchName] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null); // for small UI feedback

  useEffect(() => {
    loadBranchDetails();
    loadProducts();
  }, []);

  async function loadBranchDetails() {
    const { data, error } = await supabase
      .from("branches")
      .select("name")
      .eq("id", branchId)
      .single();

    if (error) {
      console.log("loadBranchDetails error:", error);
      return;
    }
    if (data) setBranchName(data.name);
  }

  // Get today 00:00:00 in ISO format
  function todayStartISO() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }

  // Always read price from branch_products (branch-wise price)
  async function loadProducts() {
    setLoading(true);
    
    // 1) Get products
    const { data, error } = await supabase
      .from("branch_products")
      .select(`
        id,
        price,
        available,
        products ( id, name, image_url )
      `)
      .eq("branch_id", branchId)
      .eq("available", true);

    if (error) {
      console.log("loadProducts error:", error);
      setProducts([]);
      setLoading(false);
      return;
    }

    // 2) Get today's sales count for each product
    const productIds = data?.map(bp => bp.products.id) || [];
    
    const { data: salesData, error: salesError } = await supabase
      .from("sales")
      .select("product_id, quantity")
      .eq("branch_id", branchId)
      .in("product_id", productIds)
      .gte("created_at", todayStartISO());

    // Calculate sales count per product
    const salesCountMap = {};
    if (salesData) {
      salesData.forEach(sale => {
        salesCountMap[sale.product_id] = (salesCountMap[sale.product_id] || 0) + sale.quantity;
      });
    }

    // Add sales count to each product
    const productsWithSales = (data || []).map(bp => ({
      ...bp,
      soldToday: salesCountMap[bp.products.id] || 0,
    }));

    setProducts(productsWithSales);
    setLoading(false);
  }

  async function recordSale(productId) {
    try {
      setSavingId(productId);

      // 1) Read current branch price for that product
      const { data: bp, error: bpErr } = await supabase
        .from("branch_products")
        .select("price")
        .eq("branch_id", branchId)
        .eq("product_id", productId)
        .maybeSingle();

      if (bpErr) {
        console.log("fetch branch price error:", bpErr);
        Alert.alert("Error", "Unable to fetch product price.");
        setSavingId(null);
        return;
      }

      const priceAtSale = bp?.price ?? null;

      // Fallback: if branch_products doesn't have price, fetch product price
      let finalPrice = priceAtSale;
      if (finalPrice === null || finalPrice === undefined) {
        const { data: prod, error: prodErr } = await supabase
          .from("products")
          .select("price")
          .eq("id", productId)
          .maybeSingle();

        if (prodErr) {
          console.log("fetch product price error:", prodErr);
          Alert.alert("Error", "Unable to fetch product price.");
          setSavingId(null);
          return;
        }
        finalPrice = prod?.price ?? 0;
      }

      // 2) Insert sale with price_at_sale
      const { error: insertErr } = await supabase.from("sales").insert([
        {
          branch_id: branchId,
          product_id: productId,
          quantity: 1,
          price_at_sale: finalPrice,
        },
      ]);

      if (insertErr) {
        console.log("insert sale error:", insertErr);
        Alert.alert("Error", "Failed to record sale.");
        setSavingId(null);
        return;
      }

      // Play success sound without blocking
      playDingSound();
      
      // Update sold count locally without reloading from database
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p.products.id === productId 
            ? { ...p, soldToday: (p.soldToday || 0) + 1 }
            : p
        )
      );

    } catch (e) {
      console.log("recordSale exception:", e);
    } finally {
      setSavingId(null);
    }
  }
  async function playDingSound() {
    try {
      // Enable playback in silence mode (iOS)
      Sound.setCategory('Playback');
      
      const sound = new Sound('ding.wav', Sound.MAIN_BUNDLE, (error) => {
        if (error) {
          console.log('Failed to load sound', error);
          return;
        }
        // Play the sound
        sound.play((success) => {
          if (!success) {
            console.log('Sound playback failed');
          }
          // Release the audio resource
          sound.release();
        });
      });
    } catch (e) {
      console.log("playDingSound error:", e);
    }
  }
  

  async function resetBranch() {
    Alert.alert("Reset Branch", "Are you sure you want to reset branch selection?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("selected_branch");
          navigation.replace("Welcome");
        },
      },
    ]);
  }

  const renderItem = ({ item }) => {
    const product = item.products;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => recordSale(product.id)}
        disabled={savingId === product.id}
      >
        {/* Sold Today Badge */}
        {item.soldToday > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Sold: {item.soldToday}</Text>
          </View>
        )}
        
        <Image source={{ uri: product.image_url }} style={styles.image} />
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.price}>₹{item.price}</Text>

        {savingId === product.id ? (
          <ActivityIndicator style={{ marginTop: 8 }} />
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
    <View style={styles.root}>
      <TouchableOpacity style={styles.resetBtn} onPress={resetBranch}>
        <Text style={styles.resetText}>↩ Reset Branch</Text>
      </TouchableOpacity>

      <Text style={styles.header}>Available Products on {branchName || "..."}</Text>

      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          renderItem={renderItem}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingBottom: 120 }}
        />
      )}
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff8ee", padding: 16 },
  resetBtn: {
    alignSelf: "flex-end",
    backgroundColor: "#ff8c42",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  resetText: { color: "#fff", fontWeight: "700" },
  header: { fontSize: 22, fontWeight: "800", marginBottom: 16, color: "#4a3b3b" },
  card: {
    width: "48%",
    margin: "1%",
    backgroundColor: "white",
    borderRadius: 14,
    padding: 12,
    borderColor: "#ecd8c4",
    borderWidth: 1,
    elevation: 2,
    alignItems: "center",
    paddingVertical: 16,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 10,
    elevation: 3,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  image: { width: "100%", height: 130, borderRadius: 10, backgroundColor: "#eee" },
  productName: { marginTop: 8, fontSize: 18, fontWeight: "700", textAlign: "center" },
  price: { fontSize: 16, fontWeight: "700", color: "#7a5a5a", marginTop: 6 },
});
