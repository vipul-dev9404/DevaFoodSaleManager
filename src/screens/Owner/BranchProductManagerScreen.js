// src/screens/Owner/BranchProductManagerScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { supabase } from "../../lib/supabaseClient";
import { SafeAreaView } from "react-native-safe-area-context";

export default function BranchProductManagerScreen() {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    loadBranches();
  }, []);

  // Load branches
  async function loadBranches() {
    const { data, error } = await supabase.from("branches").select("*");

    if (error) {
      console.log("Branch load error:", error);
      return;
    }

    setBranches(data);

    if (data.length > 0) {
      setSelectedBranch(data[0].id);
      loadBranchProducts(data[0].id);
    }
  }

  // Load branch products
  async function loadBranchProducts(branchId) {
    const { data, error } = await supabase
      .from("branch_products")
      .select(`
        id,
        price,
        available,
        products (
          id,
          name,
          price,
          image_url
        )
      `)
      .eq("branch_id", branchId);

    if (error) {
      console.log("Branch product load error:", error);
      return;
    }

    // FIX: rename base price manually
    const formatted = data.map(p => ({
      ...p,
      base_price: p.products.price,
    }));

    setProducts(formatted);
  }

  async function updatePrice(bpId, newPrice) {
    const { error } = await supabase
      .from("branch_products")
      .update({ price: Number(newPrice) })
      .eq("id", bpId);

    if (error) Alert.alert("Error", error.message);
    else loadBranchProducts(selectedBranch);
  }

  async function resetPrice(bpId, basePrice) {
    const { error } = await supabase
      .from("branch_products")
      .update({ price: basePrice })
      .eq("id", bpId);

    if (error) Alert.alert("Error", error.message);
    else loadBranchProducts(selectedBranch);
  }

  async function toggleAvailable(bpId, value) {
    const { error } = await supabase
      .from("branch_products")
      .update({ available: value })
      .eq("id", bpId);

    if (error) Alert.alert("Error", error.message);
    else loadBranchProducts(selectedBranch);
  }

function renderProduct({ item }) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{item.products.name}</Text>
      <Text style={styles.base}>Base: ₹{item.base_price}</Text>

      <TextInput
        defaultValue={String(item.price)}
        keyboardType="numeric"
        style={styles.priceInput}
        onEndEditing={(e) => updatePrice(item.id, e.nativeEvent.text)}
      />

      {/* Buttons aligned in a row */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.resetBtn}
          onPress={() => resetPrice(item.id, item.base_price)}
        >
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.availBtn,
            { backgroundColor: item.available ? "#4caf50" : "#e53935" },
          ]}
          onPress={() => toggleAvailable(item.id, !item.available)}
        >
          <Text style={styles.availText}>
            {item.available ? "Available" : "Hidden"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


  return (
    <SafeAreaView style={{ flex: 1}}>
    <View style={styles.root}>
      <Text style={styles.header}>Branch-wise Product Pricing</Text>

      <ScrollView horizontal style={styles.branchRow}>
        {branches.map(b => (
          <TouchableOpacity
            key={b.id}
            style={[
              styles.branchBtn,
              selectedBranch === b.id && styles.branchBtnActive,
            ]}
            onPress={() => {
              setSelectedBranch(b.id);
              loadBranchProducts(b.id);
            }}
          >
            <Text
              style={[
                styles.branchText,
                selectedBranch === b.id && styles.branchTextActive,
              ]}
            >
              {b.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(i) => i.id}
      />
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { 
    flex: 1, 
    backgroundColor: "#fff8ee", 
    padding: 16 
  },

  header: { 
    fontSize: 26, 
    fontWeight: "800", 
    marginBottom: 14 
  },

  updateAllBtn: {
    backgroundColor: "#3b3b98",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  updateAllText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
  },

  branchRow: { 
    flexDirection: "row", 
    marginBottom: 16 
  },
  branchBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#eee",
    borderRadius: 10,
    marginRight: 10,
  },
  branchBtnActive: { 
    backgroundColor: "#ff8c42" 
  },
  branchText: { 
    fontSize: 16 
  },
  branchTextActive: { 
    color: "#fff", 
    fontWeight: "700" 
  },

  card: {
    backgroundColor: "#fff",
    padding: 14,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e7d5c7",
  },

  name: { 
    fontSize: 18, 
    fontWeight: "700" 
  },

  base: { 
    color: "#777", 
    marginBottom: 4 
  },

  priceInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    marginVertical: 6,
  },

  // 🔥 Two buttons in same row
  actionRow: {
    flexDirection: "row",
    marginTop: 6,
    justifyContent: "flex-start",
    alignItems: "center",
  },

  resetBtn: {
    backgroundColor: "#444",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginRight: 10,
  },
  resetText: { 
    color: "#fff", 
    fontWeight: "600" 
  },

  availBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  availText: { 
    color: "#fff", 
    fontWeight: "700" 
  },
});
