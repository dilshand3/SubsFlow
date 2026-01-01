'use client'
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/redux/store';
import { setAdminCredentials } from '@/redux/globalSlice/globalSlice';

import {
    useGetCurrentAdminQuery,
    useDeletePlanMutation,
    useEditPlanDetailMutation,
    useCreatePlanMutation,
    useGetAllPlansAdminQuery
} from '@/redux/AdminSlice/AdminSlice';

import { PlansReduxSlice } from '@/redux/Planslice/Plans.ReduxSlice';
import Loader from '@/app/components/Loader/Loader.component';
import './Dashboard.css';
import Navbar from '@/app/components/Navbar/Navbar.componets';
import Audit_logs from '../Audit_logs/Audit_logs';
import Stats from './Stats';

const Dashboard: React.FC = () => {
    const router = useRouter();
    const dispatch = useDispatch();
    const { isAdminAuthenticated, admin } = useSelector((state: RootState) => state.global);
    const { data: sessionData, isLoading: isSessionLoading } = useGetCurrentAdminQuery();

    useEffect(() => {
        if (sessionData?.success && sessionData?.data) {
            dispatch(setAdminCredentials({ admin: sessionData.data }));
        }
    }, [sessionData, dispatch]);

    useEffect(() => {
        if (!isSessionLoading && !isAdminAuthenticated && !sessionData?.success) {
            router.push('/');
        }
    }, [isSessionLoading, isAdminAuthenticated, sessionData, router]);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<any>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newPlanData, setNewPlanData] = useState({
        name: '', description: '', price: '', duration: '', total_capacity: ''
    });

    const shouldFetch = isAdminAuthenticated;
    const { data: plansData, isLoading: plansLoading, refetch: refetchPlans } = useGetAllPlansAdminQuery(undefined, { skip: !shouldFetch });
    const [deletePlan, { isLoading: isDeleting }] = useDeletePlanMutation();
    const [editPlan, { isLoading: isEditing }] = useEditPlanDetailMutation();
    const [createPlan, { isLoading: isCreating }] = useCreatePlanMutation();

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createPlan({
                name: newPlanData.name,
                description: newPlanData.description,
                price: Number(newPlanData.price),
                duration: Number(newPlanData.duration),
                total_capacity: Number(newPlanData.total_capacity)
            }).unwrap();
            refetchPlans();
            dispatch(PlansReduxSlice.util.invalidateTags(['Plans']));
            setIsCreateModalOpen(false);
            setNewPlanData({ name: '', description: '', price: '', duration: '', total_capacity: '' });
            alert("New Plan Created Successfully!");
        } catch (error: any) { alert(error?.data?.message || "Failed"); }
    };

    const handleUpdatePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPlan) return;
        try {
            await editPlan({
                id: editingPlan.id,
                body: {
                    name: editingPlan.name,
                    price: Number(editingPlan.price),
                    description: editingPlan.description,
                    duration: Number(editingPlan.duration),
                    total_capacity: Number(editingPlan.total_capacity),
                    status: editingPlan.status
                }
            }).unwrap();
            refetchPlans();
            dispatch(PlansReduxSlice.util.invalidateTags(['Plans']));
            setIsEditModalOpen(false);
            setEditingPlan(null);
            alert("Plan updated successfully!");
        } catch (error: any) { alert(error?.data?.message || "Update failed"); }
    };

    const handleDeletePlan = async (id: string, name: string) => {
        if (confirm(`Are you sure you want to suspend "${name}"?`)) {
            try {
                await deletePlan(id).unwrap();
                refetchPlans();
                dispatch(PlansReduxSlice.util.invalidateTags(['Plans']));
                alert("Plan suspended successfully");
            } catch (error: any) { alert(error?.data?.message || "Delete failed"); }
        }
    };

    if (isSessionLoading) return <Loader />;
    if (!isAdminAuthenticated) return null;
    if (plansLoading) return <Loader />;
    if (isCreating) return <Loader />;
    if (isEditing) return <Loader />;

    return (<>
        <Navbar />
        <div className="dashboard-container">
            <h1 className="dashboard-title">Admin Dashboard</h1>
            <p className="welcome-text">Welcome back, <span className="text-gold">{admin?.name}</span></p>
            <Stats />
            <div className="section-header-row">
                <h2 className="section-heading">Manage Plans</h2>
                <button className="btn-create" onClick={() => setIsCreateModalOpen(true)}>+ Create Plan</button>
            </div>
            <div className="plans-grid">
                {plansData?.data?.map((plan: any) => {
                    const isInactive = plan.status === 'inactive';
                    return (
                        <div key={plan.id} className="admin-plan-card" style={isInactive ? { opacity: 0.7, borderColor: '#555' } : {}}>
                            <div className="plan-header">
                                <h3 style={isInactive ? { color: '#888' } : {}}>{plan.name}</h3>
                                <span className="plan-price">₹{plan.price}</span>
                            </div>
                            <p className="plan-desc">{plan.description}</p>
                            <div className={`plan-status-bar ${isInactive ? 'inactive' : (plan.subscriptions_left === 0 ? 'full' : '')}`}>
                                {isInactive ? 'SUSPENDED' : (plan.subscriptions_left === 0 ? 'SOLD OUT' : 'ACTIVE')}
                            </div>
                            <div className="plan-meta">
                                <span>Duration: {plan.duration}</span>
                                <span>Seats: {plan.subscriptions_left}/{plan.total_capacity}</span>
                            </div>
                            <div className="plan-actions">
                                <button 
                                    className="btn-icon edit" 
                                    onClick={() => { setEditingPlan(plan); setIsEditModalOpen(true); }}
                                >
                                    Edit
                                </button>
                                <button 
                                    className="btn-icon delete" 
                                    onClick={() => handleDeletePlan(plan.id, plan.name)} 
                                    disabled={isDeleting || isInactive} 
                                    style={isInactive ? { cursor: 'not-allowed', opacity: 0.5, backgroundColor: '#333', color: '#666' } : {}}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>

            {isCreateModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Create New Plan</h2>
                        <form onSubmit={handleCreateSubmit}>
                            <label>Plan Name</label>
                            <input type="text" value={newPlanData.name} onChange={(e) => setNewPlanData({ ...newPlanData, name: e.target.value })} required />
                            <label>Price</label>
                            <input type="number" value={newPlanData.price} onChange={(e) => setNewPlanData({ ...newPlanData, price: e.target.value })} required />
                            <label>Duration</label>
                            <input type="number" value={newPlanData.duration} onChange={(e) => setNewPlanData({ ...newPlanData, duration: e.target.value })} required />
                            <label>Total Capacity</label>
                            <input type="number" value={newPlanData.total_capacity} onChange={(e) => setNewPlanData({ ...newPlanData, total_capacity: e.target.value })} required />
                            <label>Description</label>
                            <textarea value={newPlanData.description} onChange={(e) => setNewPlanData({ ...newPlanData, description: e.target.value })} required />
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-save">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isEditModalOpen && editingPlan && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Edit Plan</h2>
                        <form onSubmit={handleUpdatePlan}>
                            <label>Plan Name</label>
                            <input type="text" value={editingPlan.name} onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })} required />
                            <div className="form-row">
                                <div><label>Price</label><input type="number" value={editingPlan.price} onChange={(e) => setEditingPlan({ ...editingPlan, price: e.target.value })} required /></div>
                                <div><label>Duration</label><input type="number" value={editingPlan.duration} onChange={(e) => setEditingPlan({ ...editingPlan, duration: e.target.value })} required /></div>
                            </div>
                            <div className="form-row">
                                <div><label>Total Capacity</label><input type="number" value={editingPlan.total_capacity} onChange={(e) => setEditingPlan({ ...editingPlan, total_capacity: e.target.value })} required /></div>
                                <div><label>Status</label><select value={editingPlan.status} onChange={(e) => setEditingPlan({ ...editingPlan, status: e.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
                            </div>
                            <label>Description</label><textarea value={editingPlan.description} onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })} required />
                            <div className="modal-actions"><button type="button" className="btn-cancel" onClick={() => setIsEditModalOpen(false)}>Cancel</button><button type="submit" className="btn-save">Update</button></div>
                        </form>
                    </div>
                </div>
            )}
            <Audit_logs />
        </div>
    </>);
};

export default Dashboard;