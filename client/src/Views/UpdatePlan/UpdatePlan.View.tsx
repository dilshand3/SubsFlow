'use client'
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { useGetAllActivePlansQuery, PlansReduxSlice } from '@/redux/Planslice/Plans.ReduxSlice';
import { 
    useGetUserAllSubscriptionQuery, 
    useUpdateSubscriptionMutation 
} from '@/redux/SubscriptionSlice/SubscriptionSlice';
import Loader from '@/components/Loader/Loader.component';
import './updatePlan.css';

const UpdatePlan: React.FC = () => {
    const router = useRouter();
    const dispatch = useDispatch();
    const { isAuthenticated } = useSelector((state: RootState) => state.global);
    const { 
        data: plansData, 
        isLoading: isPlansLoading 
    } = useGetAllActivePlansQuery();
    const { 
        data: subData, 
        isLoading: isSubLoading 
    } = useGetUserAllSubscriptionQuery(undefined, { skip: !isAuthenticated });
    const [updateSubscription, { isLoading: isUpdating }] = useUpdateSubscriptionMutation();
    const activeSubscription = subData?.data?.find((sub: any) => sub.status === 'active');
    const availablePlans = plansData?.data?.filter(
        (plan: any) => plan.id !== activeSubscription?.plan_id
    ) || [];

    const handleBack = () => {
        router.back();
    };

    const handleUpdatePlan = async (newPlanId: string, planName: string) => {
        if (!activeSubscription) {
            alert("No active subscription found to update.");
            return;
        }

        if (confirm(`Are you sure you want to switch to the ${planName} plan?`)) {
            try {
                const payload = {
                    currentSubId: activeSubscription.subscription_id || activeSubscription.subscription_id, // Handle ID mismatch based on your API response
                    newPlanId: newPlanId
                };

                const response = await updateSubscription(payload).unwrap();

                if (response.success) {
                    alert(response.message || "Plan updated successfully!");
                    dispatch(PlansReduxSlice.util.invalidateTags(['Plans']));
                    router.push('/profile');
                }

            } catch (error: any) {
                alert(error?.data?.message || "Failed to update plan");
            }
        }
    };
    if (isPlansLoading || isSubLoading || isUpdating) return <Loader />;
    if (!activeSubscription && !isSubLoading) {
        return (
            <div className="error-container">
                <h2>No Active Subscription Found</h2>
                <p>You need an active plan to use this feature.</p>
                <button onClick={() => router.push('/')} className="btn-subscribe" style={{width: 'auto', marginTop: '20px'}}>
                    Go to Plans
                </button>
            </div>
        );
    }

    return (
        <div className="plans-container">
            <div className="header-actions">
                <button onClick={handleBack} className="btn-back">
                    ← Back
                </button>
            </div>

            <h1 className="page-title">Upgrade / Downgrade Plan</h1>
            <p style={{textAlign: 'center', color: '#888', marginBottom: '2rem'}}>
                Switching from: <strong style={{color: 'var(--Gold-PrimaryColor)'}}>{activeSubscription?.plan_name}</strong>
            </p>

            <div className="plans-grid">
                {availablePlans.length > 0 ? (
                    availablePlans.map((plan: any) => (
                        <div key={plan.id} className="plan-card">
                            <div>
                                <h2 className="plan-name">{plan.name}</h2>
                                <p className="plan-desc">{plan.description}</p>
                                <div className="status-badge">Available</div>
                            </div>

                            <div>
                                <div className="plan-details">
                                    <div className="detail-row">
                                        <span>Price:</span>
                                        <span className="price-text">₹{plan.price}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span>Duration:</span>
                                        <span>{plan.duration}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span>Seats Left:</span>
                                        <span className="seats-text">
                                            {plan.subscriptions_left} / {plan.total_capacity}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    className="btn-subscribe btn-update" 
                                    disabled={plan.subscriptions_left <= 0 || isUpdating}
                                    onClick={() => handleUpdatePlan(plan.id, plan.name)}
                                >
                                    {plan.subscriptions_left > 0 
                                        ? (isUpdating ? 'Processing...' : 'Update to this Plan') 
                                        : 'Sold Out'}
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty-container">
                        <p>No other plans available to switch to.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default UpdatePlan;