import React, { useEffect } from "react";
import { View, Text } from "react-native";
import { supabase } from "../src/lib/supabaseClient";

export default function DebugSupabase() {
  useEffect(() => {
    runDiagnostics();
  }, []);

  async function runDiagnostics() {
    console.log("========== SUPABASE DIAGNOSTICS ==========");

    console.log("1️⃣ Checking project URL:", supabase.supabaseUrl);
    console.log("2️⃣ Checking anon key exists:", supabase.supabaseKey?.length);

    // 3) Simple REST check
    console.log("3️⃣ Testing /rest/v1 metadata…");
    try {
      const res = await fetch(`${supabase.supabaseUrl}/rest/v1/`, {
        headers: {
          apikey: supabase.supabaseKey,
          Authorization: `Bearer ${supabase.supabaseKey}`,
        },
      });
      console.log("REST STATUS =", res.status);
    } catch (e) {
      console.log("REST ERROR:", e);
    }

    // 4) Test basic SELECT
    console.log("4️⃣ Testing SELECT on branches…");
    const { data: branches, error: bErr } = await supabase
      .from("branches")
      .select("*");

    console.log("SELECT DATA:", branches);
    console.log("SELECT ERROR:", bErr);

    // 5) Test INSERT
    console.log("5️⃣ Testing INSERT on test table…");
    const { error: iErr } = await supabase
      .from("sales")
      .insert({ branch_id: "b001", product_id: null });

    console.log("INSERT ERROR:", iErr);

    // 6) Test auth session
    console.log("6️⃣ Checking current session...");
    try {
      const session = supabase.auth.session();
      console.log("SESSION:", session);
    } catch (e) {
      console.log("SESSION ERROR:", e);
    }

    console.log("=============== END TEST ================");
  }

  return (
    <View style={{ padding: 20 }}>
      <Text>Running Supabase Diagnostics… Check console logs.</Text>
    </View>
  );
}
