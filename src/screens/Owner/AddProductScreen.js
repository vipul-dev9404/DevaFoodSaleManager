import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { launchImageLibrary } from 'react-native-image-picker';
import { supabase } from "../../lib/supabaseClient";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AddProductScreen({ navigation }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState(null);

  async function pickImage() {
    launchImageLibrary({
      mediaType: 'photo',
      includeBase64: true,
      quality: 0.8,
    }, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorMessage);
      } else if (response.assets && response.assets[0]) {
        setImage(response.assets[0]);
      }
    });
  }

 async function uploadImage() {
  if (!image) return null;

  const ext = image.uri.split(".").pop();
  const fileName = `products/${Date.now()}.${ext}`;

  const base64 = image.base64;

  // Convert base64 → Uint8Array
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));


  const { data, error } = await supabase.storage
    .from("product-images")
    .upload(fileName, bytes, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (error) {
    console.log("UPLOAD ERROR:", error);
    return null;
  }

  const publicUrl = supabase.storage
    .from("product-images")
    .getPublicUrl(fileName).data.publicUrl;

  return publicUrl;
}

 async function saveProduct() {
  if (!name || !price) {
    Alert.alert("Error", "Enter name and price");
    return;
  }

  let imageUrl = null;

  if (image) {
    imageUrl = await uploadImage();
    if (!imageUrl) {
      Alert.alert("Error", "Failed to upload image");
      return;
    }
  }

  // 1️⃣ Insert Product
  const { data: product, error: prodErr } = await supabase
    .from("products")
    .insert({
      name,
      price: Number(price),
      image_url: imageUrl,
      active: true,
    })
    .select()
    .single();

  if (prodErr) {
    console.log("Insert product error:", prodErr);
    Alert.alert("Error", "Could not save product");
    return;
  }

  // 2️⃣ Fetch all branches
  const { data: branches, error: branchErr } = await supabase
    .from("branches")
    .select("id");

  if (branchErr) {
    console.log("Branch fetch error:", branchErr);
    Alert.alert("Error", "Product saved but branches could not be loaded");
    return;
  }

  // 3️⃣ Prepare rows for branch_products
  const rows = branches.map((b) => ({
    branch_id: b.id,
    product_id: product.id,
    price: Number(price), // default same as base price
    available: true,
  }));

  // 4️⃣ Insert all rows
  const { error: bpErr } = await supabase
    .from("branch_products")
    .insert(rows);

  if (bpErr) {
    console.log("Branch product insert error:", bpErr);
    Alert.alert("Warning", "Product created, but not added to all branches");
  } else {
    Alert.alert("Success", "Product added and assigned to all branches!");
  }

  navigation.goBack();
}


  return (
    <SafeAreaView style={styles.root}>
    <View style={styles.root}>
      <Text style={styles.header}>Add New Product</Text>

      <TouchableOpacity onPress={pickImage} style={styles.imageHolder}>
        {image ? (
          <Image source={{ uri: image.uri }} style={styles.preview} />
        ) : (
          <Text>Select Image</Text>
        )}
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Product Name"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="Price ₹"
        keyboardType="numeric"
        value={price}
        onChangeText={setPrice}
      />

      <TouchableOpacity style={styles.saveBtn} onPress={saveProduct}>
        <Text style={styles.saveText}>Save Product</Text>
      </TouchableOpacity>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff8f0", padding: 16 },
  header: { fontSize: 26, fontWeight: "800", marginBottom: 20 },
  input: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#f0d8c2",
    marginBottom: 12,
  },
  saveBtn: {
    backgroundColor: "#ff8c42",
    padding: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  saveText: { textAlign: "center", fontSize: 18, fontWeight: "700" },
  imageHolder: {
    height: 150,
    backgroundColor: "#f3e0c9",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  preview: { width: "100%", height: "100%", borderRadius: 10 },
});
