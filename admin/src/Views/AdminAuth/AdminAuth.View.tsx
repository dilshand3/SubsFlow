'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import {
    useLoginAdminMutation,
    useRegisterAdminMutation
} from '@/redux/AdminSlice/AdminSlice';
import { setAdminCredentials } from '@/redux/globalSlice/globalSlice';
import Loader from '@/app/components/Loader/Loader.component';
import './AdminAuth.css';

const AdminAuth: React.FC = () => {
    const router = useRouter();
    const dispatch = useDispatch();
    const { isAdminAuthenticated } = useSelector((state: RootState) => state.global);
    const [isLoginView, setIsLoginView] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        password: ''
    });
    const [loginAdmin, { isLoading: isLoginLoading }] = useLoginAdminMutation();
    const [registerAdmin, { isLoading: isRegisterLoading }] = useRegisterAdminMutation();
    useEffect(() => {
        if (isAdminAuthenticated) {
            router.push('/dashboard');
        }
    }, [isAdminAuthenticated, router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.password) {
            alert("Please fill all fields");
            return;
        }

        try {
            if (isLoginView) {
                const response = await loginAdmin(formData).unwrap();
                if (response.success && response.data) {
                    alert('Admin Login Successful!');
                    dispatch(setAdminCredentials({ admin: response.data }));
                    router.push('/dashboard');
                    return;
                }
            } else {
                const response = await registerAdmin(formData).unwrap();
                if (response.success && response.data) {
                    alert('Admin Registered & Logged In Successfully!');
                    dispatch(setAdminCredentials({ admin: response.data }));
                    
                    router.push('/dashboard');
                    setFormData({ name: '', password: '' });
                    return;
                }
            }
        } catch (error: any) {
            alert(error?.data?.message || "Authentication failed");
        }
    };

    const isLoading = isLoginLoading || isRegisterLoading;

    return (
        <div className="admin-auth-container">
            {isLoading && <Loader />}

            <div className="admin-auth-card">
                <h1 className="admin-title">
                    Admin <span className="text-gold">Portal</span>
                </h1>
                <p className="admin-subtitle">
                    {isLoginView ? 'Login to manage the system' : 'Create a new admin account'}
                </p>

                <form onSubmit={handleSubmit} className="admin-form">
                    <div className="form-group">
                        <label>Admin Name</label>
                        <input
                            type="text"
                            name="name"
                            placeholder="Enter unique admin name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            name="password"
                            placeholder="Enter password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <button type="submit" className="btn-admin-auth" disabled={isLoading}>
                        {isLoading ? 'Processing...' : (isLoginView ? 'Login' : 'Register Admin')}
                    </button>
                </form>

                <div className="toggle-view">
                    <p>
                        {isLoginView ? "New System Admin? " : "Already have an account? "}
                        <span onClick={() => setIsLoginView(!isLoginView)}>
                            {isLoginView ? "Create Account" : "Login Here"}
                        </span>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default AdminAuth;