import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { supabase } from "../../lib/supabaseClient";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ManageProductsScreen({ navigation }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("name");

    if (error) {
      console.log("Load products error:", error);
      return;
    }

    setProducts(data);
  }

  async function toggleActive(item, newValue) {
    const { error } = await supabase
      .from("products")
      .update({ active: newValue })
      .eq("id", item.id);

    if (error) {
      console.log("Toggle error:", error);
      return;
    }

    loadProducts();
  }

  // ⭐ NEW → Delete product with confirmation
  function confirmDelete(item) {
    Alert.alert(
      "Delete Product",
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteProduct(item.id),
        },
      ]
    );
  }

async function deleteProduct(productId) {
  // Step 1: Check if product is used in sales
  const { data: sales, error: salesError } = await supabase
    .from("sales")
    .select("id")
    .eq("product_id", productId)
    .limit(1);

  if (salesError) {
    console.log("Sales check error:", salesError);
    alert("Could not verify product usage.");
    return;
  }

  if (sales.length > 0) {
    alert(
      "❌ Cannot delete: This product has sales history.\n" +
        "It will be deactivated instead."
    );
    return softDeleteProduct(productId);
  }

  // Step 2: Perform hard delete
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) {
    console.log("Delete error:", error);
    alert("Failed to delete product.");
    return;
  }

  loadProducts();
}

async function softDeleteProduct(productId) {
  const { error } = await supabase
    .from("products")
    .update({ active: false })
    .eq("id", productId);

  if (error) {
    console.log("Soft delete error:", error);
    alert("Failed to deactivate product.");
    return;
  }

  loadProducts();
}


  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView style={styles.root}>
        <Text style={styles.header}>Manage Products</Text>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate("AddProduct")}
        >
          <Text style={styles.addBtnText}>+ Add New Product</Text>
        </TouchableOpacity>

        {products.map((item) => (
          <View key={item.id} style={styles.card}>
  <Image source={{ uri: item.image_url }} style={styles.image} />

  <View style={styles.cardContent}>
    <View style={styles.rowBetween}>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.price}>₹{item.price}</Text>
    </View>

    <Text style={item.active ? styles.active : styles.inactive}>
      {item.active ? "🟢 Active" : "🔴 Inactive"}
    </Text>

    <View style={styles.actionsRow}>
      <TouchableOpacity
        style={styles.editBtn}
        onPress={() =>
          navigation.navigate("EditProduct", { product: item })
        }
      >
        <Text style={styles.btnText}>Edit</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => confirmDelete(item)}
      >
        <Text style={styles.btnText}>Delete</Text>
      </TouchableOpacity>
    </View>
  </View>

  <Switch
    value={item.active}
    onValueChange={(v) => toggleActive(item, v)}
    style={{ marginLeft: 8 }}
  />
</View>


        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff8f0", padding: 16 },
  header: { fontSize: 28, fontWeight: "800", marginBottom: 20 },
  addBtn: {
    backgroundColor: "#ffb347",
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  addBtnText: { textAlign: "center", fontSize: 18, fontWeight: "700" },

  card: {
    flexDirection: "row",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f0d8c2",
    alignItems: "center",
  },
  image: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 15,
    backgroundColor: "#eee",
  },
  name: { fontSize: 18, fontWeight: "700" },
  price: { fontSize: 16, marginTop: 4 },
  status: { fontSize: 14, color: "#6b6b6b", marginTop: 4 },

  editBtn: {
    backgroundColor: "#444",
    padding: 6,
    borderRadius: 6,
    marginLeft: 10,
  },
  editBtnText: { color: "white", fontSize: 12 },

  // ⭐ NEW Delete button styles
  deleteBtn: {
    backgroundColor: "#d9534f",
    padding: 6,
    borderRadius: 6,
    marginLeft: 10,
  },
  deleteBtnText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
  status: {
  fontSize: 14,
  fontWeight: "700",
  marginTop: 8,
  color: "#444",
},

actionRow: {
  flexDirection: "row",
  marginTop: 12,
  justifyContent: "space-between",
  width: 150,
},

editBtn: {
  backgroundColor: "#444",
  paddingVertical: 6,
  paddingHorizontal: 10,
  borderRadius: 6,
},

editBtnText: {
  color: "white",
  fontSize: 12,
  fontWeight: "700",
},

deleteBtn: {
  backgroundColor: "#d9534f",
  paddingVertical: 6,
  paddingHorizontal: 10,
  borderRadius: 6,
},

deleteBtnText: {
  color: "white",
  fontSize: 12,
  fontWeight: "700",
},
card: {
  flexDirection: "row",
  backgroundColor: "white",
  padding: 14,
  borderRadius: 14,
  marginBottom: 14,
  borderWidth: 1,
  borderColor: "#e7d7c3",
  alignItems: "center",
  width: "100%",
  elevation: 1,
},

image: {
  width: 70,
  height: 70,
  borderRadius: 10,
  marginRight: 12,
  backgroundColor: "#eee",
},

cardContent: {
  flex: 1,
},

rowBetween: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},

name: {
  fontSize: 18,
  fontWeight: "700",
  color: "#333",
},

price: {
  fontSize: 16,
  fontWeight: "700",
  color: "#6b4f4f",
},

active: {
  marginTop: 6,
  fontSize: 14,
  fontWeight: "700",
  color: "green",
},

inactive: {
  marginTop: 6,
  fontSize: 14,
  fontWeight: "700",
  color: "red",
},

actionsRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: 12,
},

editBtn: {
  backgroundColor: "#444",
  paddingVertical: 6,
  paddingHorizontal: 18,
  borderRadius: 8,
},

deleteBtn: {
  backgroundColor: "#d9534f",
  paddingVertical: 6,
  paddingHorizontal: 18,
  borderRadius: 8,
},

btnText: {
  color: "white",
  fontSize: 13,
  fontWeight: "700",
},


});
