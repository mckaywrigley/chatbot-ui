'use server';
import { stripe } from '../../lib/stripe';
import { revalidatePath } from 'next/cache';
import { toSiteURL } from '../../lib/helpers';


export const createCustomerSession = async (customerId:string) => {

    const newCustomer = await createCustomer(customerId);
    
    
    return await stripe.customerSessions.create({
    customer: newCustomer?.id || '',
    components: {
      pricing_table: {
        enabled: true,
      },
    },
  });
}


  const createCustomer = async (email:string) => {
    try {
      const customer = await stripe.customers.create({
        // You can specify additional information here as needed
        description: 'My First Test Customer (created for API docs)',
        // For example, you might include email or payment method information
        email: email,
        // payment_method: 'pm_card_visa', // Assuming you have a payment method ID
      });
  
      return customer;
    } catch (error) {
      console.error('Error creating customer:', error);
    }
  }




