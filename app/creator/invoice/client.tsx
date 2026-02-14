'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { CustomerInfo } from './components/CustomerInfo'
import { ProductsSection } from './components/ProductsSection'
import { PricingSummary } from './components/PricingSummary'
import { CreatorNav } from '@/components/nav/creator-nav'

interface CustomerData {
  uid: string
  fullname: string
  email: string
  phone: string
}

interface InvoiceItem {
  id: string
  productId: string
  productName: string
  quantity: number
  price: number
}

export function CreatorInvoiceClient() {
  const router = useRouter()
  const [customer, setCustomer] = useState<CustomerData | null>(null)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [shippingFee, setShippingFee] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreateInvoice = async () => {
    if (!customer || items.length === 0) {
      setError('Please select a customer and add at least one item')
      return
    }

    try {
      setLoading(true)
      setError('')

      // Get current user and fresh token
      const user = auth.currentUser
      
      if (!user) {
        setError('Please log in to create an invoice')
        router.push('/auth/login')
        return
      }

      const token = await user.getIdToken(true) // Force refresh

      // Step 1: Create payment and get reference ID
      const paymentResponse = await fetch('/api/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          buyerEmail: customer.email,
          buyerPhone: customer.phone,
          buyerName: customer.fullname,
          buyerId: customer.uid,
          items: items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
          })),
          shippingFee,
        }),
      })

      const paymentResult = await paymentResponse.json()

      if (!paymentResult.success) {
        setError(paymentResult.error || 'Failed to create invoice')
        return
      }

      const { refId, grandPrice } = paymentResult.data

      // Step 2: Calculate item total and platform fee
      const itemsTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      const platformFee = itemsTotal * 0.05 + 100

      // Step 3: Create transaction record
      try {
        const transactionResponse = await fetch('/api/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            buyerId: customer.uid,
            items: items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              price: item.price,
            })),
            shippingFee,
            platformFee,
            price: grandPrice,
            reference: refId,
          }),
        })

        const transactionResult = await transactionResponse.json()

        if (!transactionResult.success) {
          console.warn('Warning: Failed to create transaction record:', transactionResult.error)
          // Continue anyway - payment was successful
        }
      } catch (err) {
        console.warn('Warning: Failed to create transaction record:', err)
        // Continue anyway - payment was successful
      }

      // Redirect to success page
      router.push(
        `/creator/invoice/success?refId=${refId}&grandPrice=${grandPrice}`
      )
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <CreatorNav />
      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Create Invoice</h1>
          <p className="text-muted-foreground">
            Create and send an invoice to your customer
          </p>
        </div>

        <div className="space-y-8">
          {/* Customer Information */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
            <CustomerInfo onCustomerSelect={setCustomer} />
          </div>

          {/* Products Section */}
          <div className="bg-card border border-border rounded-lg p-6">
            <ProductsSection items={items} onItemsChange={setItems} />
          </div>

          {/* Pricing Summary */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Invoice Summary</h2>
            <PricingSummary
              items={items}
              shippingFee={shippingFee}
              onShippingFeeChange={setShippingFee}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleCreateInvoice}
            disabled={loading || !customer || items.length === 0}
            size="lg"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Invoice...
              </>
            ) : (
              'Create Invoice & Proceed to Payment'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
