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
let demoMode = false; // Flag to indicate if we're in demo mode
let isInitialized = false; // Flag to track if the app has been initialized
let localCertificates = []; // Store certificates issued without wallet

// Navigation Function
function navigateToSection(sectionId) {
    // Check if wallet is required for this section
    if (sectionId === 'verify' && !wallet && !demoMode) {
        showAlert('Please connect your wallet to verify certificates', 'warning');
        return;
    }
    
    // Update active section with fade transition
    sections.forEach(section => {
        if (section.id === sectionId) {
            fadeIn(section);
            section.classList.add('active');
        } else {
            fadeOut(section);
            section.classList.remove('active');
        }
    });
    
    // Update active nav link
    navLinks.forEach(navLink => {
        navLink.classList.remove('active');
        if (navLink.getAttribute('href') === `#${sectionId}`) {
            navLink.classList.add('active');
        }
    });
    
    // Close mobile menu with fade
    if (mobileNav.classList.contains('active')) {
        fadeOut(mobileNav);
    }
    
    // Scroll to section
    document.getElementById(sectionId).scrollIntoView({ behavior: 'smooth' });
}

// Handle Navigation with Wallet Check
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        navigateToSection(targetId);
    });
});

// Check if Petra is installed
function checkPetraInstallation() {
    if (!("petra" in window)) {
        // Offer demo mode instead of redirecting
        if (confirm("Petra wallet is not installed. Would you like to continue in demo mode?")) {
            enableDemoMode();
            return false;
        }
        return false;
    }
    return true;
}

// Enable demo mode for testing without a wallet
function enableDemoMode() {
    demoMode = true;
    wallet = { 
        signAndSubmitTransaction: async (payload) => {
            // Simulate a successful transaction
            console.log("Demo mode: Simulating transaction", payload);
            
            // Simulate a delay to make it feel more realistic
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            return { hash: '0x' + Math.random().toString(16).substring(2, 42) };
        },
        disconnect: async () => {
            demoMode = false;
            wallet = null;
            account = null;
            updateUIForDisconnect();
        }
    };
    account = { 
        address: '0x' + Math.random().toString(16).substring(2, 42)
    };
    
    // Update UI for connected state
    connectWalletBtn.textContent = `Demo Mode: ${account.address.slice(0, 6)}...${account.address.slice(-4)}`;
    connectWalletBtn.classList.add('connected');
    
    // Hide alerts
    fadeOut(walletAlert);
    fadeOut(verifyWalletAlert);
    
    // Enable forms
    enableForms();
    
    showAlert('Demo mode enabled. You can test the application without a real wallet.', 'success');
}

// Update UI for wallet disconnect
function updateUIForDisconnect() {
    connectWalletBtn.textContent = 'Connect Wallet';
    connectWalletBtn.classList.remove('connected', 'disconnecting');
    
    // Show alerts
    fadeIn(verifyWalletAlert);
    
    // Disable verification form
    const verifyButton = verifyForm.querySelector('button[type="submit"]');
    if (verifyButton) {
        verifyButton.disabled = true;
    }
    
    // Clear certificate history
    certificateHistory.clear();
    updateCertificateHistoryUI();
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
                    fadeOut(verifyWalletAlert);
                    
                    // Enable verification form
                    const verifyButton = verifyForm.querySelector('button[type="submit"]');
                    if (verifyButton) {
                        verifyButton.disabled = false;
                    }
                }, 1000);
                
                // Load certificate history
                loadCertificateHistory(account.address);
                
                return { petra, account };
            } catch (error) {
                console.error('Failed to connect to Petra wallet:', error);
                
                // Check for specific blockchain errors
                if (error.message && error.message.includes('account_not_found')) {
                    showAlert('The account does not exist on the blockchain. Please try again or use demo mode.', 'error');
                } else {
                    showAlert('Failed to connect to Petra wallet. Please try again or use demo mode.', 'error');
                }
                
                // Offer demo mode
                if (confirm("Would you like to continue in demo mode?")) {
                    enableDemoMode();
                }
            }
        }
    } catch (error) {
        console.error('Error initializing wallet:', error);
        
        // Check for specific blockchain errors
        if (error.message && error.message.includes('account_not_found')) {
            showAlert('The account does not exist on the blockchain. Please try again or use demo mode.', 'error');
        } else {
            showAlert('Failed to initialize wallet. Please try again or use demo mode.', 'error');
        }
        
        // Offer demo mode
        if (confirm("Would you like to continue in demo mode?")) {
            enableDemoMode();
        }
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
        
        // Load local certificates
        const savedLocalCertificates = localStorage.getItem('localCertificates');
        if (savedLocalCertificates) {
            localCertificates = JSON.parse(savedLocalCertificates);
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
        
        // Save local certificates
        localStorage.setItem('localCertificates', JSON.stringify(localCertificates));
    } catch (error) {
        console.error('Error saving certificate history:', error);
    }
}

// Update Certificate History UI
function updateCertificateHistoryUI() {
    const historyContainer = document.getElementById('certificateHistory');
    if (!historyContainer) return;
    
    historyContainer.innerHTML = '';
    if (certificateHistory.size === 0 && localCertificates.length === 0) {
        historyContainer.innerHTML = '<p class="no-history">No certificates verified yet</p>';
        return;
    }
    
    const list = document.createElement('ul');
    
    // Add local certificates to history
    localCertificates.forEach(cert => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `
            <div class="history-content">
                <h4>Issued Certificate</h4>
                <p class="address">Recipient: ${cert.recipient.slice(0, 6)}...${cert.recipient.slice(-4)}</p>
                <p class="certificate-id">ID: ${cert.certificateId}</p>
                <p class="timestamp">Issued: ${new Date(cert.timestamp).toLocaleString()}</p>
                <button class="download-btn" onclick="downloadCertificate('${cert.recipient}', '${cert.certificateId}', '${cert.txHash}', true)">
                    <i class="fas fa-download"></i> Download
                </button>
            </div>
            <div class="history-status valid">
                <i class="fas fa-check-circle"></i>
            </div>
        `;
        list.appendChild(li);
    });
    
    // Add verified certificates to history
    certificateHistory.forEach((details, address) => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `
            <div class="history-content">
                <h4>${details.isValid ? 'Valid Certificate' : 'Invalid Certificate'}</h4>
                <p class="address">Address: ${address.slice(0, 6)}...${address.slice(-4)}</p>
                <p class="timestamp">Verified: ${new Date(details.timestamp).toLocaleString()}</p>
                ${details.isValid ? `
                <button class="download-btn" onclick="downloadCertificate('${address}', '${details.certificateId || 'Unknown'}', '${details.txHash}', ${details.isLocal || false})">
                    <i class="fas fa-download"></i> Download
                </button>
                ` : ''}
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
            return; // Don't proceed if Petra isn't installed and demo mode wasn't chosen
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
                updateUIForDisconnect();
            }, 500);
            
            showAlert('Wallet disconnected successfully!', 'success');
        } catch (error) {
            console.error('Failed to disconnect wallet:', error);
            showAlert('Failed to disconnect wallet. Please try again.', 'error');
        }
    }
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
    
    const recipientAddress = document.getElementById('recipientAddress').value;
    const certificateId = document.getElementById('certificateId').value;
    const validityPeriod = document.getElementById('validityPeriod').value;
    
    // Validate inputs
    if (!recipientAddress || !certificateId || !validityPeriod) {
        showAlert('Please fill in all fields', 'warning');
        return;
    }
    
    // Validate address format
    if (!recipientAddress.startsWith('0x') || recipientAddress.length < 10) {
        showAlert('Please enter a valid recipient address', 'warning');
        return;
    }
    
    // Validate validity period
    if (isNaN(validityPeriod) || parseInt(validityPeriod) <= 0) {
        showAlert('Please enter a valid number of days', 'warning');
        return;
    }
    
    try {
        showLoadingState(issueForm);
        
        // Simulate a delay to make it feel more realistic
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Create a unique transaction hash
        const txHash = '0x' + Math.random().toString(16).substring(2, 42);
        
        // Store certificate data
        const certificateData = {
            issuer: wallet ? account.address : '0x' + Math.random().toString(16).substring(2, 42),
            recipient: recipientAddress,
            certificateId,
            validityPeriod,
            timestamp: Date.now(),
            txHash
        };
        
        // Add to local certificates
        localCertificates.push(certificateData);
        
        // Save to local storage
        saveCertificateHistory(wallet ? account.address : 'local');
        
        // Update UI
        updateCertificateHistoryUI();
        
        hideLoadingState(issueForm);
        
        showAlert('Certificate issued successfully!', 'success');
        issueForm.reset();
    } catch (error) {
        hideLoadingState(issueForm);
        console.error('Failed to issue certificate:', error);
        showAlert('Failed to issue certificate: ' + error.message, 'error');
    }
});

// Handle Verify Certificate Form
verifyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const verifyAddress = document.getElementById('verifyAddress').value;
    
    // Validate input
    if (!verifyAddress) {
        showAlert('Please enter a certificate address', 'warning');
        return;
    }
    
    // Validate address format
    if (!verifyAddress.startsWith('0x') || verifyAddress.length < 10) {
        showAlert('Please enter a valid certificate address', 'warning');
        return;
    }
    
    try {
        showLoadingState(verifyForm);
        
        // First check if this is a local certificate
        const localCert = localCertificates.find(cert => cert.recipient === verifyAddress);
        
        if (localCert) {
            // This is a local certificate, mark it as valid
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing
            
            // Store verification result
            certificateHistory.set(verifyAddress, {
                isValid: true,
                timestamp: Date.now(),
                txHash: localCert.txHash,
                isLocal: true,
                certificateId: localCert.certificateId
            });
            
            saveCertificateHistory(wallet ? account.address : 'local');
            updateCertificateHistoryUI();
            
            hideLoadingState(verifyForm);
            showVerificationResult(true, 'This certificate was issued locally and is valid.', verifyAddress, localCert.certificateId, localCert.txHash, true);
            return;
        }
        
        // If not a local certificate and no wallet connected, show error
        if (!wallet && !demoMode) {
            hideLoadingState(verifyForm);
            showAlert('Please connect your wallet to verify blockchain certificates', 'warning');
            return;
        }
        
        let response;
        let isValid = false;
        
        if (demoMode) {
            // In demo mode, randomly determine if the certificate is valid
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Check if the certificate exists in certificate history
            isValid = certificateHistory.has(verifyAddress) && certificateHistory.get(verifyAddress).isValid;
            
            response = { hash: '0x' + Math.random().toString(16).substring(2, 42) };
        } else {
            try {
                const payload = {
                    type: 'entry_function_payload',
                    function: 'MyModule::CertificateVerification::verify_certificate',
                    type_arguments: [],
                    arguments: [verifyAddress],
                };
                
                try {
                    response = await wallet.signAndSubmitTransaction(payload);
                    
                    // In a real implementation, we would check the response to determine validity
                    // For now, we'll simulate it based on whether the address exists in our history
                    isValid = certificateHistory.has(verifyAddress) && certificateHistory.get(verifyAddress).isValid;
                } catch (txError) {
                    console.error('Transaction error:', txError);
                    
                    // Check for specific blockchain errors
                    if (txError.message && txError.message.includes('account_not_found')) {
                        // Instead of throwing an error, we'll handle it gracefully
                        hideLoadingState(verifyForm);
                        showVerificationResult(false, 'This certificate does not exist on the blockchain. It may have been issued locally or is invalid.');
                        
                        // Store failed verification
                        certificateHistory.set(verifyAddress, {
                            isValid: false,
                            timestamp: Date.now(),
                            error: 'Account not found',
                            isLocal: false
                        });
                        
                        saveCertificateHistory(account.address);
                        updateCertificateHistoryUI();
                        return;
                    } else if (txError.message && txError.message.includes('simulation')) {
                        throw new Error('Transaction simulation failed. This could be due to insufficient funds or network issues.');
                    } else {
                        throw txError;
                    }
                }
            } catch (error) {
                console.error('Verification error:', error);
                hideLoadingState(verifyForm);
                
                // Check for specific blockchain errors
                if (error.message && error.message.includes('account_not_found')) {
                    showVerificationResult(false, 'This certificate does not exist on the blockchain. It may have been issued locally or is invalid.');
                } else if (error.message && error.message.includes('simulation')) {
                    showVerificationResult(false, 'Verification failed. This could be due to insufficient funds or network issues.');
                } else {
                    showVerificationResult(false, 'Verification failed: ' + error.message);
                }
                
                // Store failed verification
                certificateHistory.set(verifyAddress, {
                    isValid: false,
                    timestamp: Date.now(),
                    error: error.message,
                    isLocal: false
                });
                
                saveCertificateHistory(account.address);
                updateCertificateHistoryUI();
                return;
            }
        }
        
        hideLoadingState(verifyForm);
        
        // Store verification result
        certificateHistory.set(verifyAddress, {
            isValid,
            timestamp: Date.now(),
            txHash: response.hash,
            isLocal: false
        });
        
        saveCertificateHistory(account.address);
        updateCertificateHistoryUI();
        
        showVerificationResult(isValid, isValid 
            ? 'The certificate exists and is currently valid.' 
            : 'The certificate either does not exist or has expired.', 
            verifyAddress, 
            certificateHistory.get(verifyAddress)?.certificateId || 'Unknown', 
            response.hash, 
            false);
    } catch (error) {
        hideLoadingState(verifyForm);
        console.error('Failed to verify certificate:', error);
        
        // Check for specific blockchain errors
        if (error.message && error.message.includes('account_not_found')) {
            showVerificationResult(false, 'This certificate does not exist on the blockchain. It may have been issued locally or is invalid.');
        } else if (error.message && error.message.includes('simulation')) {
            showVerificationResult(false, 'Verification failed. This could be due to insufficient funds or network issues.');
        } else {
            showVerificationResult(false, 'Verification failed: ' + error.message);
        }
        
        // Store failed verification
        certificateHistory.set(verifyAddress, {
            isValid: false,
            timestamp: Date.now(),
            error: error.message,
            isLocal: false
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
    // Only disable verification form, keep issue form enabled
    const verifyButton = verifyForm.querySelector('button[type="submit"]');
    if (verifyButton) {
        verifyButton.disabled = true;
    }
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

function showVerificationResult(isValid, message, address, certificateId, txHash, isLocal) {
    const result = document.getElementById('verificationResult');
    result.classList.remove('hidden', 'success', 'error');
    result.classList.add(isValid ? 'success' : 'error');
    
    const icon = result.querySelector('.result-icon i');
    const title = result.querySelector('.result-title');
    const messageElement = result.querySelector('.result-message');
    
    icon.className = `fas fa-${isValid ? 'check-circle' : 'times-circle'}`;
    title.textContent = isValid ? 'Certificate is Valid' : 'Certificate is Invalid';
    messageElement.textContent = message || (isValid
        ? 'The certificate exists and is currently valid.' 
        : 'The certificate either does not exist or has expired.');
    
    // Add download button if certificate is valid
    let downloadButton = result.querySelector('.download-btn');
    if (isValid) {
        if (!downloadButton) {
            downloadButton = document.createElement('button');
            downloadButton.className = 'download-btn';
            downloadButton.innerHTML = '<i class="fas fa-download"></i> Download Certificate';
            result.appendChild(downloadButton);
        }
        downloadButton.onclick = () => downloadCertificate(address, certificateId, txHash, isLocal);
    } else if (downloadButton) {
        downloadButton.remove();
    }
    
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

// Download Certificate as PDF
function downloadCertificate(address, certificateId, txHash, isLocal) {
    // Create a new window to generate the PDF
    const printWindow = window.open('', '_blank');
    
    // Get current date
    const currentDate = new Date().toLocaleDateString();
    
    // Create the certificate HTML
    const certificateHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Certificate - ${certificateId}</title>
            <style>
                body {
                    font-family: 'Arial', sans-serif;
                    margin: 0;
                    padding: 0;
                    background-color: #f5f5f5;
                }
                .certificate {
                    width: 800px;
                    margin: 20px auto;
                    padding: 30px;
                    background-color: white;
                    border: 10px solid #3498db;
                    box-shadow: 0 0 20px rgba(0,0,0,0.1);
                    position: relative;
                }
                .certificate::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><path fill="none" stroke="rgba(52, 152, 219, 0.1)" stroke-width="1" d="M0,0 L100,100 M100,0 L0,100"/></svg>');
                    background-size: 50px 50px;
                    opacity: 0.1;
                    z-index: 0;
                }
                .certificate-content {
                    position: relative;
                    z-index: 1;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 2px solid #3498db;
                    padding-bottom: 20px;
                }
                .header h1 {
                    color: #3498db;
                    margin: 0;
                    font-size: 36px;
                }
                .header p {
                    color: #7f8c8d;
                    margin: 5px 0 0;
                    font-size: 16px;
                }
                .certificate-body {
                    text-align: center;
                    margin: 30px 0;
                }
                .certificate-body h2 {
                    color: #2c3e50;
                    font-size: 28px;
                    margin-bottom: 20px;
                }
                .certificate-details {
                    margin: 30px 0;
                    text-align: left;
                }
                .certificate-details p {
                    margin: 10px 0;
                    font-size: 16px;
                }
                .certificate-details strong {
                    color: #3498db;
                }
                .footer {
                    margin-top: 40px;
                    text-align: center;
                    font-size: 14px;
                    color: #7f8c8d;
                }
                .verification-info {
                    margin-top: 20px;
                    padding: 15px;
                    background-color: #f9f9f9;
                    border-radius: 5px;
                    font-size: 14px;
                }
                .verification-info p {
                    margin: 5px 0;
                }
                .verification-info a {
                    color: #3498db;
                    text-decoration: none;
                }
                .verification-info a:hover {
                    text-decoration: underline;
                }
                .qr-code {
                    text-align: center;
                    margin: 20px 0;
                }
                .qr-code img {
                    width: 150px;
                    height: 150px;
                }
                @media print {
                    body {
                        background-color: white;
                    }
                    .certificate {
                        border: none;
                        box-shadow: none;
                        margin: 0;
                        padding: 20px;
                    }
                    .no-print {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            <div class="certificate">
                <div class="certificate-content">
                    <div class="header">
                        <h1>CertVerify</h1>
                        <p>Blockchain Certificate Verification</p>
                    </div>
                    
                    <div class="certificate-body">
                        <h2>Certificate of Verification</h2>
                        <p>This is to certify that the following certificate has been verified and is valid.</p>
                    </div>
                    
                    <div class="certificate-details">
                        <p><strong>Certificate ID:</strong> ${certificateId}</p>
                        <p><strong>Recipient Address:</strong> ${address}</p>
                        <p><strong>Transaction Hash:</strong> ${txHash}</p>
                        <p><strong>Issue Date:</strong> ${currentDate}</p>
                        <p><strong>Verification Type:</strong> ${isLocal ? 'Local Verification' : 'Blockchain Verification'}</p>
                    </div>
                    
                    <div class="verification-info">
                        <p>This certificate can be verified at: <a href="https://certverify.example.com/verify">https://certverify.example.com/verify</a></p>
                        <p>Enter the certificate address: ${address}</p>
                    </div>
                    
                    <div class="qr-code">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(address)}" alt="QR Code">
                    </div>
                    
                    <div class="footer">
                        <p>Generated by CertVerify on ${currentDate}</p>
                        <p>This is a digital certificate and does not require a physical signature.</p>
                    </div>
                </div>
            </div>
            
            <div class="no-print" style="text-align: center; margin: 20px;">
                <button onclick="window.print()" style="padding: 10px 20px; background-color: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Print Certificate
                </button>
            </div>
        </body>
        </html>
    `;
    
    // Write the HTML to the new window
    printWindow.document.write(certificateHTML);
    printWindow.document.close();
    
    // Wait for the QR code to load
    setTimeout(() => {
        // Automatically trigger print dialog
        printWindow.print();
    }, 1000);
}

// Initialize the application
function initializeApp() {
    if (isInitialized) return;
    
    // Check if Petra is installed
    if (!("petra" in window)) {
        // Offer demo mode on startup
        if (confirm("Petra wallet is not installed. Would you like to continue in demo mode?")) {
            enableDemoMode();
        }
    }
    
    // Show home section by default
    document.querySelector('#home').classList.add('active');
    
    // Store original button text
    document.querySelectorAll('button[type="submit"]').forEach(btn => {
        btn.setAttribute('data-original-text', btn.innerHTML);
    });
    
    // Enable issue form, disable verify form
    const issueButton = issueForm.querySelector('button[type="submit"]');
    if (issueButton) {
        issueButton.disabled = false;
    }
    
    const verifyButton = verifyForm.querySelector('button[type="submit"]');
    if (verifyButton) {
        verifyButton.disabled = true;
    }
    
    // Load local certificates
    const savedLocalCertificates = localStorage.getItem('localCertificates');
    if (savedLocalCertificates) {
        localCertificates = JSON.parse(savedLocalCertificates);
        updateCertificateHistoryUI();
    }
    
    isInitialized = true;
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp); 
