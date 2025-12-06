// src/screens/Branch/BranchKeyVerification.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../lib/supabaseClient";

export default function BranchKeyVerification({ navigation, route }) {
  const { branch } = route.params;
  const [accessKey, setAccessKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleVerifyKey() {
    setErrorMsg("");
    
    if (!accessKey || accessKey.trim().length === 0) {
      setErrorMsg("Please enter access key");
      return;
    }

    setLoading(true);

    try {
      // Verify the access key matches the branch
      const { data, error } = await supabase
        .from("branches")
        .select("id, access_key")
        .eq("id", branch.id)
        .single();

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      if (!data || data.access_key !== accessKey.trim().toUpperCase()) {
        setErrorMsg("Invalid access key");
        setLoading(false);
        return;
      }

      // Key is valid - store branch with verified flag
      const branchWithVerification = {
        ...branch,
        verified: true,
        verifiedAt: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem("selected_branch", JSON.stringify(branchWithVerification));

      // Navigate to BranchHome
      navigation.replace("BranchHome", {
        branchId: branch.id,
      });

    } catch (e) {
      console.log("Verification error:", e);
      setErrorMsg("Unexpected error during verification");
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Branch Access Key</Text>
        <Text style={styles.branchName}>{branch.name}</Text>
        <Text style={styles.subtitle}>
          Enter the 8-character access key provided by your manager
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Enter Access Key"
          value={accessKey}
          onChangeText={setAccessKey}
          autoCapitalize="characters"
          maxLength={8}
          editable={!loading}
        />

        {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleVerifyKey}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify & Continue</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2f2a27",
    textAlign: "center",
    marginBottom: 8,
  },
  branchName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#d4a574",
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 14,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 2,
    marginBottom: 12,
    backgroundColor: "#f9f9f9",
  },
  error: {
    color: "#e74c3c",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#d4a574",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelText: {
    color: "#666",
    fontSize: 14,
  },
});
