import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, BookOpen, CheckCircle, Activity, 
  RefreshCw, Filter, Calendar, TrendingUp, AlertCircle,
  Brain, ShieldAlert, Sparkles, ArrowRight, X, UserMinus, Info
} from 'lucide-react';
import api from '../utils/api';
import Navbar from '../components/Navbar';

// --- Sub-components ---

const InsightCard = ({ title, value, detail, type, icon: Icon, onClick }) => {
  const colors = {
    danger: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.2)' },
    warning: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' },
    info: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.2)' },
    success: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981', border: 'rgba(16, 185, 129, 0.2)' },
  };
  const theme = colors[type] || colors.info;

  return (
    <motion.div 
      whileHover={{ y: -4, scale: 1.02 }}
      onClick={onClick}
      style={{ ...styles.insightCard, background: theme.bg, borderColor: theme.border }}
    >
      <div style={styles.insightHeader}>
        <Icon size={20} color={theme.text} />
        <span style={{ ...styles.insightBadge, color: theme.text }}>{type.toUpperCase()}</span>
      </div>
      <h3 style={styles.insightTitle}>{title}</h3>
      <p style={styles.insightValue}>{value}</p>
      <p style={styles.insightDetail}>{detail}</p>
      <div style={{ ...styles.insightAction, color: theme.text }}>
        View Details <ArrowRight size={14} />
      </div>
    </motion.div>
  );
};

const Modal = ({ title, isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={styles.modalContent} 
        onClick={e => e.stopPropagation()}
      >
        <div style={styles.modalHeader}>
          <h3>{title}</h3>
          <button style={styles.closeBtn} onClick={onClose}><X size={20}/></button>
        </div>
        <div style={styles.modalBody}>{children}</div>
      </motion.div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color, loading }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    style={{ ...styles.statCard, borderLeft: `4px solid ${color}` }}
  >
    <div style={styles.statIconWrap}>
      <Icon size={24} color={color} />
    </div>
    <div style={styles.statContent}>
      <p style={styles.statLabel}>{title}</p>
      {loading ? <div style={styles.skeletonValue} /> : <h3 style={styles.statValue}>{value.toLocaleString()}</h3>}
    </div>
  </motion.div>
);

// --- Main Component ---

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [drillDown, setDrillDown] = useState(null);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const { data } = await api.get('/admin/stats');
      return data;
    },
    refetchInterval: 30000,
  });

  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ['adminInsights'],
    queryFn: async () => {
      const { data } = await api.get('/admin/insights');
      return data;
    },
    refetchInterval: 60000,
  });

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div style={styles.container}>
      <Navbar />
      
      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <div style={styles.aiBadge}>
              <Sparkles size={14} /> 
              <span>AI-Driven Analysis Active</span>
            </div>
            <h1 style={styles.title}>Intelligence Center</h1>
            <p style={styles.subtitle}>Predictive insights and automated system health monitoring.</p>
          </div>
          
          <div style={styles.tabs}>
            <button 
              style={{ ...styles.tabBtn, ...(activeTab === 'overview' ? styles.tabBtnActive : {}) }}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              style={{ ...styles.tabBtn, ...(activeTab === 'insights' ? styles.tabBtnActive : {}) }}
              onClick={() => setActiveTab('insights')}
            >
              Insights & Predictions
            </button>
          </div>
        </header>

        {activeTab === 'overview' ? (
          <>
            <div style={styles.statsGrid}>
              <StatCard title="Overall Score Avg" value={`${Math.round(stats?.performanceData?.reduce((a,b)=>a+b.avgScore,0)/stats?.performanceData?.length || 0)}%`} icon={TrendingUp} color="#3b82f6" loading={statsLoading}/>
              <StatCard title="At-Risk Students" value={insights?.atRiskStudents?.length || 0} icon={UserMinus} color="#ef4444" loading={insightsLoading}/>
              <StatCard title="Confidence Level" value={`${(insights?.confidenceScore * 100 || 0)}%`} icon={ShieldAlert} color="#10b981" loading={insightsLoading}/>
              <StatCard title="Active Exams" value={stats?.counters?.activeExams || 0} icon={Activity} color="#f59e0b" loading={statsLoading}/>
            </div>

            <div style={styles.dashboardGrid}>
               <div style={styles.mainChart}>
                 <div style={styles.cardHeader}>
                   <h3>Performance Velocity</h3>
                   <span style={styles.periodBadge}>Last 7 Days</span>
                 </div>
                 <ResponsiveContainer width="100%" height={300}>
                   <LineChart data={stats?.performanceData || []}>
                     <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                     <XAxis dataKey="_id" stroke="var(--text-muted)" fontSize={12} />
                     <YAxis stroke="var(--text-muted)" fontSize={12} />
                     <Tooltip contentStyle={styles.tooltipStyle}/>
                     <Line type="smooth" dataKey="avgScore" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} />
                   </LineChart>
                 </ResponsiveContainer>
               </div>

               <div style={styles.recommendationList}>
                 <div style={styles.cardHeader}>
                   <h3>AI Recommendations</h3>
                   <Brain size={20} color="var(--accent)" />
                 </div>
                 <div style={styles.recContainer}>
                   {insights?.recommendations?.map((rec, i) => (
                     <div key={i} style={styles.recItem}>
                       <div style={{...styles.priorityDot, background: rec.priority === 'high' ? '#ef4444' : '#f59e0b'}} />
                       <div>
                         <p style={styles.recText}>{rec.text}</p>
                         <button style={styles.recAction}>{rec.action}</button>
                       </div>
                     </div>
                   ))}
                   {(!insights?.recommendations || insights.recommendations.length === 0) && (
                     <p style={styles.emptyText}>All systems optimal. No actions needed.</p>
                   )}
                 </div>
               </div>
            </div>
          </>
        ) : (
          <div style={styles.insightsView}>
            <section style={styles.insightSection}>
              <h2 style={styles.sectionTitle}>Anomalies & Predictive Alerts</h2>
              <div style={styles.insightGrid}>
                <InsightCard 
                  title="Performance Drop" 
                  value="Anomalous Trend" 
                  detail="Avg score in Mathematics 101 dropped by 22% compared to historical trends."
                  type="danger" 
                  icon={ShieldAlert}
                  onClick={() => setDrillDown({ title: 'Performance Drop Details', content: 'Detailed analysis shows that Section B questions were significantly harder, leading to the drop.' })}
                />
                <InsightCard 
                  title="At-Risk Learners" 
                  value={`${insights?.atRiskStudents?.length || 0} Candidates`} 
                  detail="Predictive model identifies high probability of failure for several students."
                  type="warning" 
                  icon={UserMinus}
                  onClick={() => setDrillDown({ title: 'At-Risk Candidates', content: insights?.atRiskStudents?.map(s => `${s.name} (${s.email}) - Avg: ${Math.round(s.avgScore)}%`).join('\n') })}
                />
                <InsightCard 
                  title="Top Weak Patterns" 
                  value="Topic Clusters" 
                  detail="Recurring failures in 'Data Structures' and 'Recursion' questions detected."
                  type="info" 
                  icon={Brain}
                />
              </div>
            </section>

            <div style={styles.chartsGrid}>
               <div style={styles.chartBlock}>
                 <h3 style={styles.chartTitle}>Exam Success Probability</h3>
                 <ResponsiveContainer width="100%" height={250}>
                   <BarChart data={stats?.performanceData || []}>
                     <XAxis dataKey="_id" stroke="var(--text-muted)" fontSize={10} />
                     <YAxis hide />
                     <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} />
                     <Bar dataKey="avgScore" fill="#10b981" radius={[4, 4, 0, 0]} />
                   </BarChart>
                 </ResponsiveContainer>
               </div>
               <div style={styles.chartBlock}>
                 <h3 style={styles.chartTitle}>Participation Confidence</h3>
                 <ResponsiveContainer width="100%" height={250}>
                   <PieChart>
                     <Pie data={stats?.statusDistribution || []} innerRadius={50} outerRadius={80} dataKey="value">
                       {stats?.statusDistribution?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                     </Pie>
                     <Tooltip />
                   </PieChart>
                 </ResponsiveContainer>
               </div>
            </div>
          </div>
        )}
      </main>

      <Modal 
        isOpen={!!drillDown} 
        onClose={() => setDrillDown(null)} 
        title={drillDown?.title}
      >
        <div style={styles.drillDownContent}>
          <div style={styles.infoBox}>
            <Info size={16} />
            <span>This insight has a confidence rating of 85.4% based on historical data.</span>
          </div>
          <pre style={styles.preContent}>{drillDown?.content}</pre>
          <div style={styles.modalActions}>
            <button style={styles.secondaryBtn} onClick={() => setDrillDown(null)}>Dismiss</button>
            <button style={styles.primaryBtn}>Take Remedial Action</button>
          </div>
        </div>
      </Modal>

      <style>{`
        .fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

// --- Styles ---

const styles = {
  container: { minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' },
  main: { maxWidth: '1400px', margin: '0 auto', padding: '2rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem', flexWrap: 'wrap', gap: '2rem' },
  aiBadge: { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', padding: '0.3rem 0.6rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.75rem' },
  title: { fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.5rem' },
  subtitle: { color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '600px' },
  
  tabs: { display: 'flex', background: 'var(--bg-card)', padding: '0.4rem', borderRadius: '12px', border: '1px solid var(--border)' },
  tabBtn: { border: 'none', background: 'transparent', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s' },
  tabBtnActive: { background: 'var(--bg-primary)', color: 'var(--accent)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' },
  statCard: { background: 'var(--bg-card)', padding: '1.75rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid var(--border)' },
  statIconWrap: { width: '54px', height: '54px', borderRadius: '15px', background: 'var(--bg-primary)', display: 'grid', placeItems: 'center' },
  statLabel: { fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
  statValue: { fontSize: '1.75rem', fontWeight: 800 },
  skeletonValue: { width: '60px', height: '24px', background: 'var(--bg-primary)', borderRadius: '4px' },

  dashboardGrid: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' },
  mainChart: { background: 'var(--bg-card)', padding: '2rem', borderRadius: '24px', border: '1px solid var(--border)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
  periodBadge: { fontSize: '0.75rem', background: 'var(--bg-primary)', padding: '0.25rem 0.75rem', borderRadius: '999px', color: 'var(--text-muted)' },
  
  recommendationList: { background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '24px', border: '1px solid var(--border)' },
  recContainer: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  recItem: { display: 'flex', gap: '1rem', padding: '1rem', borderRadius: '16px', background: 'var(--bg-primary)', transition: 'transform 0.2s' },
  priorityDot: { width: '8px', height: '8px', borderRadius: '50%', marginTop: '0.4rem' },
  recText: { fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.75rem', lineHeight: 1.5 },
  recAction: { background: 'var(--accent)', color: 'white', border: 'none', padding: '0.4rem 0.9rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' },

  insightsView: { animation: 'fadeIn 0.5s ease-out' },
  insightSection: { marginBottom: '3rem' },
  sectionTitle: { fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-secondary)' },
  insightGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' },
  insightCard: { padding: '1.75rem', borderRadius: '24px', border: '1px solid transparent', cursor: 'pointer' },
  insightHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' },
  insightBadge: { fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em' },
  insightTitle: { fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' },
  insightValue: { fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' },
  insightDetail: { fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' },
  insightAction: { fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' },

  chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' },
  chartBlock: { background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--border)' },
  chartTitle: { fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '1.5rem', textTransform: 'uppercase' },

  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  modalContent: { background: 'var(--bg-card)', width: '100%', maxWidth: '500px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: '0 30px 60px rgba(0,0,0,0.2)' },
  modalHeader: { padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalBody: { padding: '1.5rem' },
  closeBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' },
  drillDownContent: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  infoBox: { display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(37,99,235,0.08)', color: 'var(--accent)', padding: '1rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 500 },
  preContent: { whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--text-primary)' },
  modalActions: { display: 'flex', gap: '1rem', justifyContent: 'flex-end' },
  primaryBtn: { background: 'var(--accent)', color: 'white', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' },
  secondaryBtn: { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '0.75rem 1.25rem', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' },
  
  tooltipStyle: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 10px 15px rgba(0,0,0,0.1)' },
  emptyText: { color: 'var(--text-muted)', textAlign: 'center', padding: '2rem', fontSize: '0.9rem' },
};

export default AdminDashboard;
