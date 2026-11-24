import { Redirect } from 'expo-router';
import { MerchantRouteGate } from '../features/navigation/MerchantRouteGate';
export default function MerchantSignInScreen(){return <MerchantRouteGate><Redirect href="/" /></MerchantRouteGate>;}
