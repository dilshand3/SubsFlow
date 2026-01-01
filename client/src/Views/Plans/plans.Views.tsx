'use client'
import React, { FC, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { 
    useGetAllActivePlansQuery, 
    PlansReduxSlice
} from '@/redux/Planslice/Plans.ReduxSlice';
import { useGetCurrentUserQuery } from '@/redux/UserSlice/UserSlice';
import { usePurchaseSubscriptionMutation } from '@/redux/SubscriptionSlice/SubscriptionSlice';
import { setAuthCredentials } from '@/redux/globalSlice/globalSlice';
import Navbar from '@/components/Navbar/Navbar.componets';
import Loader from '@/components/Loader/Loader.component';
import './plans.Views.css';

const PlansView: FC = () => {
    const router = useRouter();
    const dispatch = useDispatch();
    const { isAuthenticated } = useSelector((state: RootState) => state.global);

    const { 
        data: plansData, 
        isLoading: isPlansLoading, 
        error: plansError 
    } = useGetAllActivePlansQuery();

    const { 
        data: currentUserData, 
        isLoading: isUserLoading 
    } = useGetCurrentUserQuery(undefined, { skip: isAuthenticated });

    const [purchasePlan, { isLoading: isPurchasing }] = usePurchaseSubscriptionMutation();

    useEffect(() => {
        if (currentUserData?.success && currentUserData?.data) {
            dispatch(setAuthCredentials({ user: currentUserData.data }));
        }
    }, [currentUserData, dispatch]);

    const handleSubscribe = async (planId: string, planName: string) => {
        if (!isAuthenticated) {
            router.push('/auth');
            return;
        }

        if (confirm(`Do you want to purchase the ${planName} plan?`)) {
            try {
                const response = await purchasePlan({ planId }).unwrap();

                if (response.success) {
                    alert('Subscription activated successfully! 🎉');
                    dispatch(PlansReduxSlice.util.invalidateTags(['Plans']));
                    router.push('/profile');
                }

            } catch (error: any) {
                const msg = error?.data?.message || "Failed to purchase subscription.";
                console.log(error?.data?.message);
                alert(msg);
            }
        }
    };
    if (isPlansLoading || isUserLoading || isPurchasing) {
        return <Loader />;
    }

    if (plansError) {
        return (
            <div className="error-container">
                <h2>Oops! Something went wrong.</h2>
                <p>Unable to load plans. Please try again later.</p>
                <button onClick={() => window.location.reload()} className="btn-subscribe" style={{width: 'auto', marginTop: '10px'}}>
                    Retry
                </button>
            </div>
        );
    }

    const plans = plansData?.data || [];
    return (
        <>
            <Navbar />
            <div className="plans-container">
                <h1 className="page-title">Available Plans</h1>

                <div className="plans-grid">
                    {plans.length > 0 ? (
                        plans.map((plan: any) => (
                            <div key={plan.id} className="plan-card">
                                <div>
                                    <h2 className="plan-name">{plan.name}</h2>
                                    <p className="plan-desc">{plan.description}</p>
                                    
                                    <div className="status-badge">
                                        {plan.status}
                                    </div>
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
                                        className="btn-subscribe"
                                        disabled={plan.subscriptions_left <= 0 || isPurchasing}
                                        onClick={() => handleSubscribe(plan.id, plan.name)}
                                        style={{ opacity: isPurchasing ? 0.7 : 1 }}
                                    >
                                        {plan.subscriptions_left > 0 
                                            ? (isPurchasing ? 'Processing...' : 'Subscribe Now') 
                                            : 'Sold Out'}
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="empty-container">
                            <p>No active plans available at the moment.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default PlansView;