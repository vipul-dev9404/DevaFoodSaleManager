import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Switch,
} from "react-native";
import { launchImageLibrary } from 'react-native-image-picker';
import { supabase } from "../../lib/supabaseClient";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EditProductScreen({ route, navigation }) {
  const { product } = route.params;

  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(String(product.price));
  const [active, setActive] = useState(product.active);
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(product.image_url);

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

  async function uploadImageIfNeeded() {
    if (!image) return imageUrl;

    const ext = image.uri.split(".").pop();
    const fileName = `products/${Date.now()}.${ext}`;
    const blob = Uint8Array.from(atob(image.base64), c => c.charCodeAt(0));


    const { data, error } = await supabase.storage
      .from("product-images")
      .upload(fileName, blob, {
        contentType: "image/jpeg",
      });

    if (error) {
      console.log("Upload error:", error);
      return imageUrl; 
    }

    const { publicUrl } = supabase.storage
      .from("product-images")
      .getPublicUrl(fileName).data;

    return publicUrl;
  }

  async function saveProduct() {
    if (!name || !price) {
      Alert.alert("Error", "Name and price are required.");
      return;
    }

    const finalUrl = await uploadImageIfNeeded();

    const { error } = await supabase
      .from("products")
      .update({
        name,
        price: Number(price),
        active,
        image_url: finalUrl,
      })
      .eq("id", product.id);

    if (error) {
      console.log("Update error:", error);
      Alert.alert("Error", "Failed to update product");
      return;
    }

    Alert.alert("Success", "Product updated!");
    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.root}>
    <View style={styles.root}>
      <Text style={styles.header}>Edit Product</Text>

      <TouchableOpacity onPress={pickImage} style={styles.imageHolder}>
        {image ? (
          <Image source={{ uri: image.uri }} style={styles.preview} />
        ) : imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.preview} />
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

      <View style={styles.switchRow}>
        <Text style={{ fontSize: 16 }}>Active</Text>
        <Switch value={active} onValueChange={setActive} />
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={saveProduct}>
        <Text style={styles.saveText}>Save Changes</Text>
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
  imageHolder: {
    height: 150,
    backgroundColor: "#f3e0c9",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  preview: { width: "100%", height: "100%", borderRadius: 10 },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10,
    padding: 10,
  },
  saveBtn: {
    backgroundColor: "#ff8c42",
    padding: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  saveText: { textAlign: "center", fontSize: 18, fontWeight: "700" },
});
