'use client'
import React from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/redux/store';
import { useAdminLogoutMutation } from '@/redux/AdminSlice/AdminSlice';
import { clearAdminAuth } from '@/redux/globalSlice/globalSlice' ; // Ensure ye path sahi ho
import './Navbar.css';

const Navbar: React.FC = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAdminAuthenticated, admin } = useSelector((state: RootState) => state.global);
  
  const [logoutAdmin] = useAdminLogoutMutation();

  const handleLogout = async () => {
    try {
      await logoutAdmin().unwrap();

      dispatch(clearAdminAuth());
      router.push('/');
    } catch (error) {
      dispatch(clearAdminAuth());
      router.push('/');
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <span className="navbar-logo" onClick={() => router.push('/')}>
          Admin<span className="text-gold">Panel</span>
        </span>

        {/* Action Buttons */}
        <div className="navbar-actions">
          {isAdminAuthenticated ? (
            <div className="user-info">
              <button className="navbar-btn logout-btn" onClick={handleLogout}>
                Logout ↪
              </button>
            </div>
          ) : (
            <button className="navbar-btn" onClick={() => router.push('/')}>
              Login
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar;