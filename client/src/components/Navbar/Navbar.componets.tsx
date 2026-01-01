'use client'
import React from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import './Navbar.css';

const Navbar: React.FC = () => {
  const router = useRouter();

  // ✅ Redux se User aur Admin dono ki state nikali
  const { 
    isAuthenticated, 
    user, 
    isAdminAuthenticated, 
    admin 
  } = useSelector((state: RootState) => state.global);

  const handleNavigation = () => {
    // 1. Priority check: Agar Admin login hai
    if (isAdminAuthenticated) {
      router.push('/dashboard'); 
      return;
    }

    // 2. Agar User login hai
    if (isAuthenticated) {
      router.push('/profile'); 
      return;
    }

    // 3. Agar koi login nahi hai
    router.push('/auth'); 
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <span className="navbar-logo" onClick={() => router.push('/')}>
          Subscribe<span className="text-gold">-Flow</span>
        </span>

        {/* Action Button */}
        <button className="navbar-btn" onClick={handleNavigation}>
          
          {/* Case 1: Admin Login */}
          {isAdminAuthenticated ? (
             <div className="user-info">
                <span className="user-name">Dashboard</span>
                <span className="profile-icon">🛡️</span> {/* Shield icon for Admin */}
             </div>
          ) : 
          
          /* Case 2: User Login */
          isAuthenticated ? (
            <div className="user-info">
               <span className="user-name">{user?.name || 'Profile'}</span>
               <span className="profile-icon">👤</span>
            </div>
          ) : 
          
          /* Case 3: No Login */
          (
            'Login'
          )}
        </button>
      </div>
    </nav>
  )
}

export default Navbar;