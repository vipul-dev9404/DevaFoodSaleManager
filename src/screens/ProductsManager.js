import React, {useState, useEffect} from 'react';
import { View, TextInput, Button, FlatList, Text } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { SafeAreaView } from "react-native-safe-area-context";


export default function ProductsManager() {
  const [name, setName] = useState('');
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending:false });
    setProducts(data || []);
  }

  async function addProduct() {
    if (!name) return;
    await supabase.from('products').insert([{ name }]);
    setName('');
    fetchProducts();
  }

  return (
  <SafeAreaView style={{ flex: 1 }}>

    <View style={{padding:16}}>
      <TextInput placeholder="Product name" value={name} onChangeText={setName} style={{borderWidth:1, padding:8, marginBottom:12}} />
      <Button title="Add product" onPress={addProduct} />
      <FlatList data={products} keyExtractor={i=>i.id} renderItem={({item}) => (
        <View style={{padding:8, borderBottomWidth:1}}><Text>{item.name}</Text></View>
      )} />
    </View>
    </SafeAreaView>
  );
}
