// DOM Elements
const navLinks = document.querySelectorAll('.nav-links a');
const sections = document.querySelectorAll('.section');
const hamburger = document.querySelector('.hamburger');
const mobileNav = document.querySelector('.nav-links');
const connectWalletBtn = document.getElementById('connectWallet');
const issueForm = document.getElementById('issueForm');
const verifyForm = document.getElementById('verifyForm');
const walletAlert = document.getElementById('walletAlert');
const verifyWalletAlert = document.getElementById('verifyWalletAlert');
const verificationResult = document.getElementById('verificationResult');

// Wallet and Certificate State
let wallet = null;
let account = null;
const certificateHistory = new Map();

// Check if Petra is installed
function checkPetraInstallation() {
    if (!("petra" in window)) {
        // Store the current URL to return after installation
        localStorage.setItem('returnUrl', window.location.href);
        // Redirect to Petra wallet installation
        window.location.href = 'chrome-extension://ejjladinnckdgjemekebdpeokbikhfci/onboarding.html';
        return false;
    }
    return true;
}

// Initialize Petra Wallet
async function initializeWallet() {
    try {
        const petra = window.petra;
        if (petra) {
            try {
                // Connect to Petra wallet
                await petra.connect();
                
                // Get account
                const account = await petra.account();
                if (!account) {
                    throw new Error('No account found');
                }
                
                // Update UI with animation
                connectWalletBtn.classList.add('connecting');
                setTimeout(() => {
                    connectWalletBtn.textContent = `Connected: ${account.address.slice(0, 6)}...${account.address.slice(-4)}`;
                    connectWalletBtn.classList.remove('connecting');
                    connectWalletBtn.classList.add('connected');
                    
                    // Hide alerts with animation
                    fadeOut(walletAlert);
                    fadeOut(verifyWalletAlert);
                    
                    // Enable forms with animation
                    enableForms();
                }, 1000);
                
                // Load certificate history
                loadCertificateHistory(account.address);
                
                return { petra, account };
            } catch (error) {
                console.error('Failed to connect to Petra wallet:', error);
                showAlert('Failed to connect to Petra wallet. Please try again.', 'error');
            }
        }
    } catch (error) {
        console.error('Error initializing wallet:', error);
        showAlert('Failed to initialize wallet. Please try again.', 'error');
    }
    return null;
}

// Load Certificate History
async function loadCertificateHistory(address) {
    try {
        // Load from localStorage first
        const savedHistory = localStorage.getItem(`certificates_${address}`);
        if (savedHistory) {
            const parsed = JSON.parse(savedHistory);
            Object.entries(parsed).forEach(([key, value]) => {
                certificateHistory.set(key, value);
            });
        }
        
        updateCertificateHistoryUI();
    } catch (error) {
        console.error('Error loading certificate history:', error);
    }
}

// Save Certificate History
function saveCertificateHistory(address) {
    try {
        const historyObj = Object.fromEntries(certificateHistory);
        localStorage.setItem(`certificates_${address}`, JSON.stringify(historyObj));
    } catch (error) {
        console.error('Error saving certificate history:', error);
    }
}

// Update Certificate History UI
function updateCertificateHistoryUI() {
    const historyContainer = document.getElementById('certificateHistory');
    if (!historyContainer) return;
    
    historyContainer.innerHTML = '';
    if (certificateHistory.size === 0) {
        historyContainer.innerHTML = '<p class="no-history">No certificates verified yet</p>';
        return;
    }
    
    const list = document.createElement('ul');
    certificateHistory.forEach((details, address) => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `
            <div class="history-content">
                <h4>${details.isValid ? 'Valid Certificate' : 'Invalid Certificate'}</h4>
                <p class="address">Address: ${address.slice(0, 6)}...${address.slice(-4)}</p>
                <p class="timestamp">Verified: ${new Date(details.timestamp).toLocaleString()}</p>
            </div>
            <div class="history-status ${details.isValid ? 'valid' : 'invalid'}">
                <i class="fas fa-${details.isValid ? 'check-circle' : 'times-circle'}"></i>
            </div>
        `;
        list.appendChild(li);
    });
    
    historyContainer.appendChild(list);
}

// Handle Wallet Connection
connectWalletBtn.addEventListener('click', async () => {
    if (!wallet) {
        if (!checkPetraInstallation()) {
            return; // Don't proceed if Petra isn't installed
        }
        
        connectWalletBtn.classList.add('connecting');
        connectWalletBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
        
        const connection = await initializeWallet();
        if (connection) {
            wallet = connection.petra;
            account = connection.account;
            showAlert('Wallet connected successfully!', 'success');
        } else {
            connectWalletBtn.classList.remove('connecting');
            connectWalletBtn.textContent = 'Connect Wallet';
        }
    } else {
        // Disconnect wallet
        try {
            await wallet.disconnect();
            wallet = null;
            account = null;
            
            // Update UI with animation
            connectWalletBtn.classList.add('disconnecting');
            setTimeout(() => {
                connectWalletBtn.textContent = 'Connect Wallet';
                connectWalletBtn.classList.remove('connected', 'disconnecting');
                
                // Show alerts with animation
                fadeIn(walletAlert);
                fadeIn(verifyWalletAlert);
                
                // Disable forms
                disableForms();
                
                // Clear certificate history
                certificateHistory.clear();
                updateCertificateHistoryUI();
            }, 500);
            
            showAlert('Wallet disconnected successfully!', 'success');
        } catch (error) {
            console.error('Failed to disconnect wallet:', error);
            showAlert('Failed to disconnect wallet. Please try again.', 'error');
        }
    }
});

// Handle Navigation with Wallet Check
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        
        // Check if wallet is required for this section
        if ((targetId === 'issue' || targetId === 'verify') && !wallet) {
            showAlert('Please connect your wallet first', 'warning');
            return;
        }
        
        // Update active section with fade transition
        sections.forEach(section => {
            if (section.id === targetId) {
                fadeIn(section);
                section.classList.add('active');
            } else {
                fadeOut(section);
                section.classList.remove('active');
            }
        });
        
        // Update active nav link
        navLinks.forEach(navLink => navLink.classList.remove('active'));
        link.classList.add('active');
        
        // Close mobile menu with fade
        if (mobileNav.classList.contains('active')) {
            fadeOut(mobileNav);
        }
    });
});

// Handle Mobile Menu
hamburger.addEventListener('click', () => {
    if (mobileNav.classList.contains('active')) {
        fadeOut(mobileNav);
    } else {
        fadeIn(mobileNav);
    }
});

// Handle Issue Certificate Form
issueForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!wallet) {
        showAlert('Please connect your wallet first', 'warning');
        return;
    }
    
    const recipientAddress = document.getElementById('recipientAddress').value;
    const certificateId = document.getElementById('certificateId').value;
    const validityPeriod = document.getElementById('validityPeriod').value;
    
    try {
        const payload = {
            type: 'entry_function_payload',
            function: 'MyModule::CertificateVerification::issue_certificate',
            type_arguments: [],
            arguments: [
                recipientAddress,
                certificateId,
                parseInt(validityPeriod) * 24 * 60 * 60 // Convert days to seconds
            ],
        };
        
        showLoadingState(issueForm);
        const response = await wallet.signAndSubmitTransaction(payload);
        hideLoadingState(issueForm);
        
        // Store certificate data
        const certificateData = {
            issuer: account.address,
            recipient: recipientAddress,
            certificateId,
            validityPeriod,
            timestamp: Date.now(),
            txHash: response.hash
        };
        
        certificateHistory.set(recipientAddress, {
            isValid: true,
            timestamp: Date.now(),
            ...certificateData
        });
        
        saveCertificateHistory(account.address);
        updateCertificateHistoryUI();
        
        showAlert('Certificate issued successfully!', 'success');
        issueForm.reset();
    } catch (error) {
        hideLoadingState(issueForm);
        console.error('Failed to issue certificate:', error);
        showAlert('Failed to issue certificate. Please try again.', 'error');
    }
});

// Handle Verify Certificate Form
verifyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!wallet) {
        showAlert('Please connect your wallet first', 'warning');
        return;
    }
    
    const verifyAddress = document.getElementById('verifyAddress').value;
    
    try {
        const payload = {
            type: 'entry_function_payload',
            function: 'MyModule::CertificateVerification::verify_certificate',
            type_arguments: [],
            arguments: [verifyAddress],
        };
        
        showLoadingState(verifyForm);
        const response = await wallet.signAndSubmitTransaction(payload);
        hideLoadingState(verifyForm);
        
        const isValid = true; // This should be determined from the transaction response
        
        // Store verification result
        certificateHistory.set(verifyAddress, {
            isValid,
            timestamp: Date.now(),
            txHash: response.hash
        });
        
        saveCertificateHistory(account.address);
        updateCertificateHistoryUI();
        
        showVerificationResult(isValid);
    } catch (error) {
        hideLoadingState(verifyForm);
        console.error('Failed to verify certificate:', error);
        showVerificationResult(false);
        
        // Store failed verification
        certificateHistory.set(verifyAddress, {
            isValid: false,
            timestamp: Date.now(),
            error: error.message
        });
        
        saveCertificateHistory(account.address);
        updateCertificateHistoryUI();
    }
});

// Animation and UI Utilities
function fadeIn(element) {
    element.style.opacity = '0';
    element.classList.add('active');
    setTimeout(() => {
        element.style.opacity = '1';
    }, 50);
}

function fadeOut(element) {
    element.style.opacity = '0';
    setTimeout(() => {
        element.classList.remove('active');
    }, 500);
}

function showLoadingState(form) {
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
}

function hideLoadingState(form) {
    const button = form.querySelector('button[type="submit"]');
    button.disabled = false;
    button.innerHTML = button.getAttribute('data-original-text') || 'Submit';
}

function enableForms() {
    document.querySelectorAll('button[type="submit"]').forEach(btn => {
        btn.disabled = false;
        btn.setAttribute('data-original-text', btn.innerHTML);
    });
}

function disableForms() {
    document.querySelectorAll('button[type="submit"]').forEach(btn => {
        btn.disabled = true;
    });
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert ${type}`;
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-circle' : 'times-circle'}"></i>
        ${message}
    `;
    
    document.body.appendChild(alertDiv);
    
    // Animate in
    setTimeout(() => alertDiv.classList.add('show'), 10);
    
    // Animate out and remove
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => alertDiv.remove(), 500);
    }, 5000);
}

function showVerificationResult(isValid) {
    const result = document.getElementById('verificationResult');
    result.classList.remove('hidden', 'success', 'error');
    result.classList.add(isValid ? 'success' : 'error');
    
    const icon = result.querySelector('.result-icon i');
    const title = result.querySelector('.result-title');
    const message = result.querySelector('.result-message');
    
    icon.className = `fas fa-${isValid ? 'check-circle' : 'times-circle'}`;
    title.textContent = isValid ? 'Certificate is Valid' : 'Certificate is Invalid';
    message.textContent = isValid
        ? 'The certificate exists and is currently valid.'
        : 'The certificate either does not exist or has expired.';
    
    // Reset animations
    result.style.opacity = '0';
    result.style.transform = 'translateY(20px) scale(0.95)';
    
    // Trigger reflow
    void result.offsetWidth;
    
    // Show result with animation
    result.classList.add('show');
    
    // Animate history update
    setTimeout(() => {
        updateCertificateHistoryUI();
    }, 1000);
}

// Check for return from installation
document.addEventListener('DOMContentLoaded', () => {
    // Check if returning from extension installation
    const returnUrl = localStorage.getItem('returnUrl');
    if (returnUrl) {
        localStorage.removeItem('returnUrl'); // Clear the stored URL
        if (checkPetraInstallation()) {
            // Automatically try to connect if returning from installation
            connectWalletBtn.click();
        }
    }
    
    // Show home section by default
    document.querySelector('#home').classList.add('active');
    
    // Store original button text
    document.querySelectorAll('button[type="submit"]').forEach(btn => {
        btn.setAttribute('data-original-text', btn.innerHTML);
    });
    
    // Disable forms by default
    disableForms();
}); 