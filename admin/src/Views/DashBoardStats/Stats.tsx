'use client'
import React from 'react'
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { useGetDashboardStatsQuery } from '@/redux/AdminSlice/AdminSlice';
import Loader from '@/app/components/Loader/Loader.component';

const Stats : React.FC = () => {
  // --- Auth Check ---
  const { isAdminAuthenticated } = useSelector((state: RootState) => state.global);
  const shouldFetch = isAdminAuthenticated;

  // --- API Call ---
  const { data: statsData, isLoading } = useGetDashboardStatsQuery(undefined, { 
    skip: !shouldFetch 
  });

  if (isLoading) return <Loader />;

  return (
    <div className="stats-grid">
        <div className="stat-card">
            <h3>Total Revenue</h3>
            <p className="stat-value">₹{statsData?.data?.total_revenue || 0}</p>
        </div>
        <div className="stat-card">
            <h3>Total Users</h3>
            <p className="stat-value">{statsData?.data?.total_users || 0}</p>
        </div>
        <div className="stat-card">
            <h3>Active Subs</h3>
            <p className="stat-value text-gold">{statsData?.data?.active_subs || 0}</p>
        </div>
        <div className="stat-card">
            <h3>Available Plans</h3>
            <p className="stat-value">{statsData?.data?.available_plans || 0}</p>
        </div>
    </div>
  )
}

export default Stats;