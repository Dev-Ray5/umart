'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Loader2, ArrowRight } from 'lucide-react'
import { CreatorNav } from '@/components/nav/creator-nav'

interface Transaction {
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

export function CreatorTransactionsClient() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)

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

    const fetchTransactions = async () => {
      try {
        setLoading(true)
        const user = auth.currentUser
        if (!user) return

        const token = await user.getIdToken()

        const response = await fetch('/api/transactions?action=sale', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const result = await response.json()

        if (result.success) {
          setTransactions(result.data)
        } else {
          setError(result.error || 'Failed to load transactions')
        }
      } catch (err: any) {
        console.error('Error fetching transactions:', err)
        setError(err.message || 'Failed to load transactions')
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [isAuthenticated])

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
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <CreatorNav />
        <div className="flex items-center justify-center min-h-[calc(100vh-60px)]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading sales...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <CreatorNav />
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Sales</h1>
          <p className="text-muted-foreground">
            Track all your sales and manage confirmations
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-6">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {transactions.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">No sales yet</p>
            <Button onClick={() => router.push('/creator/invoice')}>
              Create First Invoice
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {transactions.map((transaction) => (
              <Card
                key={transaction.id}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/creator/transactions/${transaction.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold">
                        Ref: {transaction.reference}
                      </h3>
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {formatDate(transaction.createdAt)}
                      </span>
                      {transaction.confirmed && (
                        <span className="text-xs bg-green-500/20 text-green-700 px-2 py-1 rounded">
                          Confirmed
                        </span>
                      )}
                      {transaction.withdrawn && (
                        <span className="text-xs bg-blue-500/20 text-blue-700 px-2 py-1 rounded">
                          Withdrawn
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 mb-4 text-sm text-muted-foreground">
                      <p>
                        <strong>Items:</strong> {transaction.items.length} product
                        {transaction.items.length > 1 ? 's' : ''}
                      </p>
                      <div className="space-y-1">
                        {transaction.items.slice(0, 2).map((item, idx) => (
                          <p key={idx}>
                            • {item.productName} × {item.quantity}
                          </p>
                        ))}
                        {transaction.items.length > 2 && (
                          <p>
                            • +{transaction.items.length - 2} more
                            item{transaction.items.length - 2 > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                      <div>
                        <p className="text-xs text-muted-foreground">Shipping</p>
                        <p className="font-semibold">₦{transaction.shippingFee.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Platform Fee</p>
                        <p className="font-semibold">₦{transaction.platformFee.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-semibold text-lg text-primary">
                          ₦{transaction.price.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="ml-4">
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
