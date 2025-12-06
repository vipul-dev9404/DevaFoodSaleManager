// src/screens/Branch/SelectBranchScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../lib/supabaseClient";

export default function SelectBranchScreen({ navigation }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [manualCode, setManualCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    loadRememberedBranch();
    fetchBranches();
  }, []);

  // --------------------------------------------------------
  // AUTO LOGIN IF BRANCH ALREADY SELECTED AND VERIFIED
  // --------------------------------------------------------
  async function loadRememberedBranch() {
    const saved = await AsyncStorage.getItem("selected_branch");
    if (saved) {
      const branch = JSON.parse(saved);
      // Check if branch was verified (has verified flag and it's recent - within 24 hours)
      if (branch.verified && branch.verifiedAt) {
        const verifiedTime = new Date(branch.verifiedAt);
        const now = new Date();
        const hoursSinceVerification = (now - verifiedTime) / (1000 * 60 * 60);
        
        if (hoursSinceVerification < 24) {
          navigation.replace("BranchHome", { branchId: branch.id });
          return;
        }
      }
      // If not verified or verification expired, clear saved branch
      await AsyncStorage.removeItem("selected_branch");
    }
  }

  // --------------------------------------------------------
  // Fetch branches list
  // --------------------------------------------------------
  async function fetchBranches() {
    const { data, error } = await supabase.from("branches").select();

    if (error) {
      setErrorMsg(error.message);
    } else {
      console.log("Branches fetched:", data);
      
      setBranches(data);
    }
    setLoading(false);
  }

  // --------------------------------------------------------
  // On selecting from list - navigate to key verification
  // --------------------------------------------------------
  async function handleBranchSelect(branch) {
    navigation.navigate("BranchKeyVerification", { branch });
  }

  // --------------------------------------------------------
  // Manual Code (BR001, BR002...) - also requires key verification
  // --------------------------------------------------------
  async function submitManualCode() {
    setErrorMsg("");

    const code = manualCode.trim().toUpperCase();

    if (code.length === 0) {
      setErrorMsg("Please enter a branch code.");
      return;
    }

    const { data, error } = await supabase
      .from("branches")
      .select()
      .eq("code", code)
      .limit(1);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    if (!data || data.length === 0) {
      setErrorMsg("Invalid branch code");
      return;
    }

    const branch = data[0];
    navigation.navigate("BranchKeyVerification", { branch });
  }

  // --------------------------------------------------------
  // UI
  // --------------------------------------------------------
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Select Your Branch</Text>
      <Text style={styles.subtitle}>Choose from list or enter code manually</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#2f2a27" style={{ marginTop: 30 }} />
      ) : (
        <ScrollView style={styles.list}>
          {branches.map((branch) => (
            <TouchableOpacity
              key={branch.id}
              style={styles.branchItem}
              onPress={() => handleBranchSelect(branch)}
            >
              <Text style={styles.branchText}>{branch.name}</Text>
              <Text style={styles.branchCode}>{branch.code}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Manual Code
      <View style={styles.manualWrap}>
        <Text style={styles.manualLabel}>Enter Branch Code</Text>

        <TextInput
          placeholder="Example: BR001"
          style={styles.input}
          value={manualCode}
          onChangeText={setManualCode}
        />

        {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

        <TouchableOpacity style={styles.submitButton} onPress={submitManualCode}>
          <Text style={styles.submitText}>Continue</Text>
        </TouchableOpacity>
      </View> */}
    </View>
  );
}

// --------------------------------------------------------
// STYLES
// --------------------------------------------------------
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fff8f0",
    paddingHorizontal: 16,
    paddingTop: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#2f2a27",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#6b5a50",
    marginBottom: 20,
    textAlign: "center",
  },

  list: { maxHeight: "45%", marginTop: 10 },

  branchItem: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ead9ce",
    marginBottom: 10,
  },
  branchText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2f2a27",
  },
  branchCode: {
    fontSize: 14,
    color: "#7a6f6a",
    marginTop: 3,
  },

  manualWrap: {
    marginTop: 25,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderColor: "#ead9ce",
    borderWidth: 1,
  },
  manualLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3e322f",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#fff5ec",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#f0e2d8",
    marginBottom: 10,
  },

  submitButton: {
    backgroundColor: "#2f2a27",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  submitText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  error: {
    color: "#b00020",
    marginBottom: 6,
  },
});
