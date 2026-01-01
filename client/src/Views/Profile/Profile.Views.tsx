'use client'
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/redux/store';

import { 
    useGetUserAllSubscriptionQuery, 
    useCancelUserSubscriptionMutation 
} from '@/redux/SubscriptionSlice/SubscriptionSlice';

import { useGetCurrentUserQuery, useLazyLogoutUserQuery } from '@/redux/UserSlice/UserSlice';
import { clearAuth, setAuthCredentials } from '@/redux/globalSlice/globalSlice';
import { PlansReduxSlice } from '@/redux/Planslice/Plans.ReduxSlice';

import Loader from '@/components/Loader/Loader.component';
import Navbar from '@/components/Navbar/Navbar.componets';
import './Profile.css';

const Profile: React.FC = () => {
    const router = useRouter();
    const dispatch = useDispatch();
    
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const { isAuthenticated, user } = useSelector((state: RootState) => state.global);

    // Hooks
    const [triggerLogout, { isLoading: isLogoutLoading }] = useLazyLogoutUserQuery();
    const [cancelSubscription, { isLoading: isCancelling }] = useCancelUserSubscriptionMutation();

    const { data: userData, isLoading: isUserLoading } = useGetCurrentUserQuery(undefined, {
        skip: isAuthenticated
    });

    const { data: subData, isLoading: subLoading } = useGetUserAllSubscriptionQuery(undefined, {
        skip: !isAuthenticated
    });

    // --- Effects (Sync & Protect) ---
    useEffect(() => {
        if (userData?.success && userData?.data) {
            dispatch(setAuthCredentials({ user: userData.data }));
        }
    }, [userData, dispatch]);

    useEffect(() => {
        if (!isUserLoading && !isAuthenticated && !userData?.success && !isLoggingOut) {
            router.push('/auth');
        }
    }, [isUserLoading, isAuthenticated, userData, router, isLoggingOut]);

    // Helpers
    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    // Handlers
    const handleLogout = async () => {
        if (confirm('Are you sure you want to logout?')) {
            try {
                setIsLoggingOut(true);
                await triggerLogout().unwrap();
                dispatch(clearAuth());
                router.push('/');
            } catch (error) {
                console.error("Logout failed", error);
                dispatch(clearAuth());
                router.push('/');
            }
        }
    };

    const handleCancelSubscription = async (subId: string) => {
        if (confirm('Are you sure you want to cancel this subscription?')) {
            try {
                const response = await cancelSubscription(subId).unwrap();
                if(response.success) {
                    alert(response.message || "Subscription cancelled successfully");
                    // Refresh Plans Data
                    dispatch(PlansReduxSlice.util.invalidateTags(['Plans']));
                }
            } catch (error: any) {
                console.error("Cancel failed", error);
                alert(error?.data?.message || "Failed to cancel subscription");
            }
        }
    };

    // ✅ New: Handle Update Navigation
    const handleUpdateNavigation = (currentSubId: string) => {
        // Hum currentSubId ko query param me bhej sakte hain agar zarurat ho, 
        // par abhi ke liye seedha route change kar rahe hain.
        router.push(`/update-plan`); 
    };

    // Guards
    if (isUserLoading || isLogoutLoading) return <Loader />;
    if (isLoggingOut) return <Loader />;
    if (!isAuthenticated) return <Loader />;

    return (
        <>
            <Navbar />
            {isCancelling && <Loader />} 
            
            <div className="profile-container">
                <h1 className="section-title">My Profile</h1>
                
                <div className="user-card">
                    <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                        <div className="user-avatar">
                            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="user-details">
                            <h2>{user?.name || 'Guest User'}</h2>
                            <p>{user?.email || 'No email provided'}</p>
                        </div>
                    </div>
                    
                    <button 
                        className="btn-logout" 
                        onClick={handleLogout}
                        disabled={isLogoutLoading || isLoggingOut}
                    >
                        {isLogoutLoading ? 'Logging out...' : 'Logout'}
                    </button>
                </div>

                <h1 className="section-title">Subscription History</h1>

                {subLoading ? (
                    <div style={{color: 'white', textAlign: 'center'}}>Loading...</div>
                ) : (
                    <div className="subs-grid">
                        {subData?.data && subData.data.length > 0 ? (
                            subData.data.map((sub) => (
                                <div key={sub.subscription_id} className={`sub-card ${sub.status === 'active' ? 'active' : ''}`}>
                                    <div className="sub-header">
                                        <span className="plan-name">{sub.plan_name}</span>
                                        <span className="sub-price">₹{sub.price}</span>
                                    </div>
                                    
                                    <span className={`status-badge status-${sub.status.toLowerCase()}`}>
                                        {sub.status}
                                    </span>
                                    
                                    <div className="date-row">
                                        <span>Start Date:</span>
                                        <span>{formatDate(sub.start_date)}</span>
                                    </div>
                                    <div className="date-row">
                                        <span>End Date:</span>
                                        <span>{formatDate(sub.end_date)}</span>
                                    </div>
                                    
                                    {/* ✅ ACTION BUTTONS (Only for Active Plans) */}
                                    {sub.status === 'active' && (
                                        <div className="action-buttons" >
                                            
                                            {/* 1. Update Plan Button */}
                                            <button 
                                                className="btn-update-sub"
                                                onClick={() => handleUpdateNavigation(sub.subscription_id)}
                                                disabled={isCancelling}
                                            >
                                                Update / Switch Plan
                                            </button>

                                            {/* 2. Cancel Button */}
                                            <button 
                                                className="btn-cancel-sub" 
                                                onClick={() => handleCancelSubscription(sub.subscription_id)}
                                                disabled={isCancelling}
                                                style={{
                                                    flex: 1,
                                                    opacity: isCancelling ? 0.5 : 1 
                                                }}
                                            >
                                                {isCancelling ? '...' : 'Cancel'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p style={{color: '#b3b3b3', textAlign:'center'}}>You have no subscription history.</p>
                        )}
                    </div>
                )}
            </div>
        </>
    )
}

export default Profile;