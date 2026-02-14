'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Loader2, ChevronLeft, Check } from 'lucide-react'
import { CreatorNav } from '@/components/nav/creator-nav'

interface TransactionDetail {
  id: string
  reference: string
  buyerId: string
  items: Array<{ productName: string; quantity: number; price: number }>
  shippingFee: number
  platformFee: number
  price: number
  confirmed: boolean
  withdrawn: boolean
  createdAt: any
}

export function CreatorTransactionDetailClient() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [transaction, setTransaction] = useState<TransactionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [confirmingReceived, setConfirmingReceived] = useState(false)
  const [requestingWithdrawal, setRequestingWithdrawal] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true)
      } else {
        router.push('/auth/login')
      }
    })

    return () => unsubscribe()
  }, [router])

  useEffect(() => {
    if (!isAuthenticated) return

    const fetchTransactionDetails = async () => {
      try {
        setLoading(true)
        const user = auth.currentUser
        if (!user) return

        const token = await user.getIdToken()

        // Fetch transaction details
        const response = await fetch(`/api/transactions?action=sale&id=${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const result = await response.json()

        if (!result.success) {
          setError(result.error || 'Failed to load transaction')
          return
        }

        setTransaction(result.data)
      } catch (err: any) {
        console.error('Error fetching transaction:', err)
        setError(err.message || 'Failed to load transaction')
      } finally {
        setLoading(false)
      }
    }

    fetchTransactionDetails()
  }, [id, isAuthenticated])

  const handleConfirmReceived = async () => {
    if (!transaction) return

    try {
      setConfirmingReceived(true)
      const user = auth.currentUser
      if (!user) return

      const token = await user.getIdToken()

      const response = await fetch('/api/reference/confirm-value', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          referenceId: transaction.reference,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setTransaction((prev) =>
          prev ? { ...prev, confirmed: true } : null
        )
      } else {
        setError(result.error || 'Failed to confirm received')
      }
    } catch (err: any) {
      console.error('Error confirming received:', err)
      setError(err.message || 'Failed to confirm received')
    } finally {
      setConfirmingReceived(false)
    }
  }

  const handleRequestWithdrawal = async () => {
    if (!transaction) return

    try {
      setRequestingWithdrawal(true)
      const user = auth.currentUser
      if (!user) return

      const token = await user.getIdToken()

      const response = await fetch('/api/reference/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          referenceId: transaction.reference,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setTransaction((prev) =>
          prev ? { ...prev, withdrawn: true } : null
        )
      } else {
        setError(result.error || 'Failed to request withdrawal')
      }
    } catch (err: any) {
      console.error('Error requesting withdrawal:', err)
      setError(err.message || 'Failed to request withdrawal')
    } finally {
      setRequestingWithdrawal(false)
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return ''
    let date: Date
    if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
      date = new Date(timestamp.seconds * 1000)
    } else {
      date = new Date(timestamp)
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <CreatorNav />
        <div className="flex items-center justify-center min-h-[calc(100vh-60px)]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading transaction...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!transaction) {
    return (
      <div className="min-h-screen bg-background">
        <CreatorNav />
        <div className="max-w-2xl mx-auto p-6">
          <Button variant="ghost" onClick={() => router.back()} className="mb-6">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Card className="p-8 text-center">
            <p className="text-destructive mb-4">{error || 'Transaction not found'}</p>
            <Button onClick={() => router.push('/creator/transactions')}>
              View All Sales
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <CreatorNav />
      <div className="max-w-2xl mx-auto p-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Sale Details</h1>
          <p className="text-muted-foreground">{transaction.reference}</p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-6">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {/* Status Section */}
        <Card className="p-6 mb-6">
          <div className="space-y-3">
            {/* Confirmed Status */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="font-semibold mb-1">Customer Received Value</h3>
                <p className="text-sm text-muted-foreground">
                  Customer confirms they received the products
                </p>
              </div>
              {transaction.confirmed ? (
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-green-700 font-medium text-sm">Confirmed</span>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
                  <span className="text-yellow-700 font-medium text-sm">Pending</span>
                </div>
              )}
            </div>

            {/* Withdrawal Status */}
            <div className="flex items-center justify-between pt-4">
              <div>
                <h3 className="font-semibold mb-1">Withdrawal</h3>
                <p className="text-sm text-muted-foreground">
                  Request to withdraw payment to your account
                </p>
              </div>
              {transaction.withdrawn ? (
                <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-blue-600" />
                    <span className="text-blue-700 font-medium text-sm">Requested</span>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={handleRequestWithdrawal}
                  disabled={requestingWithdrawal || !transaction.confirmed}
                  size="sm"
                >
                  {requestingWithdrawal ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Requesting...
                    </>
                  ) : (
                    'Request Withdrawal'
                  )}
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Items */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Items Sold</h2>
          <div className="space-y-4">
            {transaction.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center pb-4 border-b border-border last:border-b-0">
                <div>
                  <p className="font-medium">{item.productName}</p>
                  <p className="text-sm text-muted-foreground">
                    Quantity: {item.quantity}
                  </p>
                </div>
                <p className="font-semibold">
                  ₦{(item.price * item.quantity).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Pricing Summary */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Pricing Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping Fee</span>
              <span className="font-medium">₦{transaction.shippingFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform Fee</span>
              <span className="font-medium">₦{transaction.platformFee.toLocaleString()}</span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between">
              <span className="font-semibold">Total Sale Amount</span>
              <span className="font-bold text-lg text-primary">
                ₦{transaction.price.toLocaleString()}
              </span>
            </div>
          </div>
        </Card>

        {/* Transaction Info */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Transaction Information</h2>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Sale Date</p>
              <p className="font-medium">{formatDate(transaction.createdAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Reference ID</p>
              <p className="font-mono text-xs break-all">{transaction.reference}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Buyer ID</p>
              <p className="font-mono text-xs break-all">{transaction.buyerId}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
