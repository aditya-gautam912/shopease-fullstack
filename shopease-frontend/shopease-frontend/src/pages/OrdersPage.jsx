/**
 * src/pages/OrdersPage.jsx
 * User's order history page - mobile optimized
 */
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { orderService } from '../services/index';
import { fmtPrice, fmtDate, statusClass } from '../utils/helpers';
import EmptyState from '../components/common/EmptyState';
import PageSpinner from '../components/common/PageSpinner';
import { FiDownload } from 'react-icons/fi';

const FALLBACK = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&q=60';

export default function OrdersPage() {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    orderService.getMyOrders()
      .then(setOrders)
      .finally(() => setLoading(false));
  }, []);

  const handleDownloadInvoice = async (orderId) => {
    setDownloading(orderId);
    try {
      await orderService.downloadInvoice(orderId);
      toast.success('Invoice downloaded!');
    } catch {
      toast.error('Failed to download invoice');
    } finally {
      setDownloading(null);
    }
  };

  if (loading) return <PageSpinner />;
  if (!orders.length) return <EmptyState icon="📦" title="No orders yet" subtitle="Place your first order and it will appear here." actionLabel="Start Shopping" actionTo="/products" />;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-1 sm:mb-2">My Orders</h1>
      <p className="text-sm text-gray-500 mb-5 sm:mb-8">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
      <div className="space-y-3 sm:space-y-4">
        {orders.map((order, i) => (
          <motion.div key={order._id}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="card p-4 sm:p-5"
          >
            <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
              <div>
                <p className="text-[10px] sm:text-xs text-gray-400 font-mono">#{order._id.slice(-10).toUpperCase()}</p>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">{fmtDate(order.createdAt)}</p>
              </div>
              <span className={`text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full capitalize ${statusClass(order.status)}`}>
                {order.status}
              </span>
            </div>
            <div className="flex gap-1.5 sm:gap-2 flex-wrap mb-2 sm:mb-3">
              {order.items.slice(0, 4).map((item, j) => (
                <img key={j} src={item.image} alt={item.title}
                  onError={(e) => { e.target.src = FALLBACK; }}
                  className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-lg bg-gray-100" />
              ))}
              {order.items.length > 4 && (
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] sm:text-xs font-bold text-gray-400">
                  +{order.items.length - 4}
                </div>
              )}
            </div>
            <div className="flex justify-between items-center text-xs sm:text-sm">
              <div className="flex items-center gap-3">
                <span className="text-gray-500">{order.items.length} item{order.items.length > 1 ? 's' : ''} · {order.paymentMethod?.toUpperCase()}</span>
                <button
                  onClick={() => handleDownloadInvoice(order._id)}
                  disabled={downloading === order._id}
                  className="flex items-center gap-1 text-primary-500 hover:text-primary-600 font-medium transition-colors disabled:opacity-50"
                  title="Download Invoice"
                >
                  {downloading === order._id ? (
                    <span className="w-3.5 h-3.5 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
                  ) : (
                    <FiDownload size={14} />
                  )}
                  <span className="hidden sm:inline">Invoice</span>
                </button>
              </div>
              <span className="font-extrabold text-gray-900 dark:text-white text-sm sm:text-base">{fmtPrice(order.total)}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
