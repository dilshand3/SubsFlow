'use client'
import React, { FC } from 'react';
import './Loader.css';

const Loader: FC = () => {
    return (
        <div className="loader-overlay">
            <div className="loader-content">
                <div className="spinner"></div>
            </div>
        </div>
    );
};

export default Loader;