import EncryptedStorage from 'react-native-encrypted-storage';
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { supabase } from "../lib/supabaseClient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function OwnerDashboard({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [productData, setProductData] = useState([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadDashboard();
    setupRealtime();
  }, []);

  // 🔥 Realtime listener
  function setupRealtime() {
    try {
      const channel = supabase
        .channel("sales-realtime")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "sales" },
          () => loadDashboard()
        )
        .subscribe();
      return () => channel.unsubscribe();
    } catch (e) {
      console.log("Realtime error:", e);
      return null;
    }
  }

  // ⏰ Get today 00:00:00
  function todayStartISO() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }

  // 📥 Fetch only today's sales (uses price_at_sale)
  async function loadDashboard() {
    setLoading(true);

    const { data, error } = await supabase
      .from("sales")
      .select(
        `
      id,
      product_id,
      quantity,
      price_at_sale,
      created_at,
      products ( id, name, image_url, active )
    `
      )
      .gte("created_at", todayStartISO());

    if (error) {
      console.log("Dashboard load error:", error);
      setLoading(false);
      return;
    }

    calculateTotals(data || []);
    setLoading(false);
  }

  // 🔢 Calculate product totals using price_at_sale
  function calculateTotals(rows) {
    const map = {};
    let total = 0;

    rows.forEach((row) => {
      const product = row.products;
      if (!product) return;

      const price = row.price_at_sale ?? 0;

      if (!map[product.id]) {
        map[product.id] = {
          id: product.id,
          name: product.name,
          image_url: product.image_url,
          active: product.active,
          qty: 0,
          earning: 0,
        };
      }

      map[product.id].qty += row.quantity;
      map[product.id].earning += row.quantity * price;

      total += row.quantity * price;
    });

    setProductData(Object.values(map));
    setGrandTotal(total);
  }

  // 🚪 Logout owner
  async function handleOwnerLogout() {
    try {
      await supabase.auth.signOut();
      await EncryptedStorage.removeItem("access_token");
      await EncryptedStorage.removeItem("refresh_token");

      navigation.reset({
        index: 0,
        routes: [{ name: "Welcome" }],
      });
    } catch (err) {
      console.log("Logout error:", err);
    }
  }

  const renderCard = ({ item }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.image_url }} style={styles.image} />
      <Text style={styles.name}>{item.name}</Text>

      <View style={styles.row}>
        <Text style={styles.qty}>Sold: {item.qty}</Text>
        <Text style={styles.earn}>₹ {item.earning}</Text>
      </View>

      <Text
        style={[
          styles.status,
          { color: item.active ? "green" : "red" },
        ]}
      >
        {item.active ? "Active" : "Inactive"}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff8ee" }}>
      {/* ⭐ Sticky Toolbar */}
      <View style={[styles.stickyWrapper, { top: insets.top }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.toolbar}
        >
          <TouchableOpacity
            style={styles.toolButton}
            onPress={() => navigation.navigate("AddBranch")}
          >
            <Text style={styles.icon}>🏬</Text>
            <Text style={styles.iconLabel}>Create Branch</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolButton}
            onPress={() => navigation.navigate("ManageBranchKeys")}
          >
            <Text style={styles.icon}>🔑</Text>
            <Text style={styles.iconLabel}>Branch Keys</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolButton}
            onPress={() => navigation.navigate("BranchProductManager")}
          >
            <Text style={styles.icon}>🏷️</Text>
            <Text style={styles.iconLabel}>Branch Prices</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolButton}
            onPress={() => navigation.navigate("BranchEarnings")}
          >
            <Text style={styles.icon}>📊</Text>
            <Text style={styles.iconLabel}>Earnings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolButton}
            onPress={() => navigation.navigate("ManageProducts")}
          >
            <Text style={styles.icon}>⚙️</Text>
            <Text style={styles.iconLabel}>Products</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolButton}
            onPress={handleOwnerLogout}
          >
            <Text style={styles.icon}>🚪</Text>
            <Text style={styles.iconLabel}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ⭐ Push content down because toolbar is sticky */}
      <View style={[styles.root, { paddingTop: insets.top + 90 }]}>
        <Text style={styles.header}>Deepak's (Owner) Dashboard</Text>

        <View style={styles.totalBox}>
          <Text style={styles.totalTitle}>Today's Earnings</Text>
          <Text style={styles.totalValue}>₹{grandTotal}</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="black" />
        ) : (
          <FlatList
            data={productData}
            renderItem={renderCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={{ paddingBottom: 130 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

/* ------------ STYLES (UNCHANGED) ------------ */
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fff8ee",
    paddingHorizontal: 10,
    paddingTop: 10,
  },

  header: {
    fontSize: 26,
    fontWeight: "800",
    marginVertical: 12,
  },

  totalBox: {
    backgroundColor: "#ffe3ba",
    padding: 18,
    borderRadius: 14,
    marginBottom: 20,
  },

  totalTitle: { fontSize: 18, fontWeight: "600" },
  totalValue: { fontSize: 30, fontWeight: "800", marginTop: 5 },

  card: {
    backgroundColor: "white",
    width: "48%",
    margin: "1%",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0d8c2",
    elevation: 3,
  },

  image: { width: "100%", height: 110, borderRadius: 8, backgroundColor: "#eee" },
  name: { fontSize: 16, fontWeight: "700" },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  qty: { fontSize: 13 },
  earn: { fontSize: 13, fontWeight: "700" },
  status: { marginTop: 6, fontSize: 13, fontWeight: "700" },

  /* Sticky toolbar */
  stickyWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff8ee",
    paddingVertical: 10,
    zIndex: 999,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
  },

  toolbar: { flexDirection: "row", paddingLeft: 10, paddingRight: 10 },
  toolButton: {
    width: 90,
    alignItems: "center",
    marginHorizontal: 6,
    backgroundColor: "#ffbf69",
    paddingVertical: 8,
    borderRadius: 12,
  },
  icon: { fontSize: 22 },
  iconLabel: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: "600",
    color: "#3d2c2c",
    textAlign: "center",
  },
});
