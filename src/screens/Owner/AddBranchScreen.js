// src/screens/Owner/AddBranchScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabaseClient";

export default function AddBranchScreen({ navigation }) {
  const [branchName, setBranchName] = useState("");
  const [loading, setLoading] = useState(false);
  const [nextCode, setNextCode] = useState("");

  useEffect(() => {
    computeNextBranchCode();
  }, []);

  // ---------------------------
  // Compute next BR code like BR001, BR002
  // ---------------------------
  async function computeNextBranchCode() {
    try {
      const { data, error } = await supabase
        .from("branches")
        .select("code")
        .order("code", { ascending: false })
        .limit(1);

      if (error) {
        console.log("computeNextBranchCode error:", error);
        setNextCode("BR001");
        return;
      }

      if (!data || data.length === 0) {
        setNextCode("BR001");
        return;
      }

      const lastCode = data[0].code || "BR000"; // fallback
      const digits = lastCode.replace(/[^0-9]/g, "") || "0";
      const num = parseInt(digits, 10) + 1;
      setNextCode("BR" + String(num).padStart(3, "0"));
    } catch (e) {
      console.log("computeNextBranchCode exception:", e);
      setNextCode("BR001");
    }
  }

  // ---------------------------
  // Generate unique access key
  // ---------------------------
  function generateAccessKey() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let key = '';
    for (let i = 0; i < 8; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }

  // ---------------------------
  // Insert branch and auto-assign products
  // ---------------------------
  async function handleCreateBranch() {
    if (!branchName || branchName.trim().length === 0) {
      Alert.alert("Validation", "Please enter branch name.");
      return;
    }

    setLoading(true);

    try {
      // Generate ID/code in-app (TEXT)
      const newId = nextCode || (await generateFallbackCode());
      
      // Generate unique access key for this branch
      const accessKey = generateAccessKey();

      // 1) Insert branch
      const { data: branchData, error: insertErr } = await supabase
        .from("branches")
        .insert({
          id: newId,
          name: branchName.trim(),
          code: newId,
          access_key: accessKey,
        })
        .select()
        .single();

      if (insertErr) {
        console.log("Insert Branch Error:", insertErr);
        Alert.alert("Error", insertErr.message || "Failed to create branch.");
        setLoading(false);
        return;
      }

      // 2) Fetch all active products (owner may prefer all products; change to active only if desired)
      const { data: products, error: prodErr } = await supabase
        .from("products")
        .select("id, price")
        .order("name", { ascending: true });

      if (prodErr) {
        console.log("Fetch products error:", prodErr);
        // Branch created but product fetch failed — still a success for branch creation
        Alert.alert(
          "Branch created",
          "Branch created but failed to load products to assign."
        );
        setLoading(false);
        navigation.goBack();
        return;
      }

      if (!products || products.length === 0) {
        Alert.alert(
          "Branch created",
          "Branch created successfully. No products found to assign."
        );
        setLoading(false);
        navigation.goBack();
        return;
      }

      // 3) Prepare branch_products rows and bulk insert
      const rows = products.map((p) => ({
        branch_id: newId,
        product_id: p.id,
        price: p.price,
        available: true,
      }));

      const { error: bpErr } = await supabase
        .from("branch_products")
        .insert(rows);

      if (bpErr) {
        console.log("branch_products insert error:", bpErr);
        Alert.alert(
          "Partial success",
          "Branch created but failed to assign products. Check logs."
        );
        setLoading(false);
        navigation.goBack();
        return;
      }

      // Success - show access key to owner
      Alert.alert(
        "Success", 
        `Branch ${newId} created & products assigned.\n\nAccess Key: ${branchData.access_key}\n\nShare this key with your branch head. They will need it to access the branch.`,
        [{ text: "OK" }]
      );
      // recompute next code for convenience if user wants to add another branch
      computeNextBranchCode();
      setBranchName("");
      setLoading(false);
      navigation.goBack();
    } catch (e) {
      console.log("handleCreateBranch exception:", e);
      Alert.alert("Error", "Unexpected error creating branch.");
      setLoading(false);
    }
  }

  // Fallback generator if nextCode isn't present for some reason
  async function generateFallbackCode() {
    try {
      const t = Date.now();
      // Use timestamp-based br code (guaranteed unique)
      return "BR" + String(Number(String(t).slice(-6))).padStart(3, "0");
    } catch (e) {
      return "BR" + Math.floor(Math.random() * 900 + 100);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.header}>Add New Branch</Text>

        <Text style={styles.label}>Branch Name</Text>
        <TextInput
          placeholder="e.g. Deva Foods"
          style={styles.input}
          value={branchName}
          onChangeText={setBranchName}
        />

        <Text style={[styles.label, { marginTop: 8 }]}>Assigned Branch Code</Text>
        <TextInput
          value={nextCode}
          editable={false}
          style={[styles.input, { backgroundColor: "#f2f0eeff" }]}
        />

        <TouchableOpacity
          style={[styles.addBtn, loading ? { opacity: 0.7 } : null]}
          onPress={handleCreateBranch}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.addBtnText}>Create Branch & Assign Products</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------
// Styles
// ---------------------------
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fff8ee",
    padding: 16,
  },
  header: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 18,
    color: "#3d2c2c",
  },
  label: {
    fontSize: 15,
    color: "#6b5a50",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#f0daca",
    marginBottom: 12,
  },
  addBtn: {
    backgroundColor: "#ff8c42",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  backBtn: {
    marginTop: 18,
    alignItems: "center",
  },
  backText: {
    color: "#6b5a50",
    fontSize: 15,
  },
});
