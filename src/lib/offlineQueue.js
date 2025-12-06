import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';

const PENDING_KEY = 'pending_sales_v1';

export async function enqueueSale(sale) {
  const raw = await AsyncStorage.getItem(PENDING_KEY);
  const arr = raw ? JSON.parse(raw) : [];
  arr.push(sale);
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(arr));
}

export async function syncPendingSales(branchToken) {
  const raw = await AsyncStorage.getItem(PENDING_KEY);
  const arr = raw ? JSON.parse(raw) : [];
  const remaining = [];
  for (const item of arr) {
    try {
      const res = await supabase
        .from('sales')
        .insert([{
          product_id: item.product_id,
          branch_id: item.branch_id,
          qty: item.qty || 1
        }], {
          headers: { 'x-branch-token': branchToken }
        });
      if (res.error) {
        console.log('sync error', res.error);
        remaining.push(item);
      }
    } catch (e) {
      console.log('sync exception', e);
      remaining.push(item);
    }
  }
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(remaining));
  return remaining.length === 0;
}
