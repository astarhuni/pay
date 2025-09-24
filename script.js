// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const amount = urlParams.get('amount') || 1500; // Default amount if not specified

// Update amount display
document.getElementById('payableAmount').textContent = amount;

// Add this at the top with other constants
let successUTRs = [];


// Fetch success UTRs
async function fetchSuccessUTRs() {
    try {
        const response = await fetch('succes.json');
        const data = await response.json();
        successUTRs = Object.values(data);
    } catch (error) {
        console.error('Error loading success UTRs:', error);
    }
}

// Fetch UPI ID from upi.txt
async function fetchUpiId() {
    try {
        const response = await fetch('upi.txt');
        const data = await response.text();
        const upiData = JSON.parse(data);
        
        document.getElementById('upiId').textContent = upiData.id;
        document.getElementById('upiName').textContent = `Receiver: ${upiData.name}`;
        generateQR(upiData.id, amount);
    } catch (error) {
        console.error('Error fetching UPI ID:', error);
        document.getElementById('upiId').textContent = 'Error loading UPI ID';
        document.getElementById('upiName').textContent = '';
    }
}

// Generate QR code
function generateQR(upiId, amount) {
    const upiUrl = `upi://pay?pa=${upiId}&pn=ALPHX&am=${amount}&cu=INR`;
    
    const qr = qrcode(0, 'M');
    qr.addData(upiUrl);
    qr.make();
    
    document.getElementById('qrCode').innerHTML = qr.createImgTag(6);
}

// Copy UPI ID
function copyUpiId() {
    const upiId = document.getElementById('upiId').textContent;
    const copyBtn = document.querySelector('.copy-btn');
    
    navigator.clipboard.writeText(upiId).then(() => {
        // Change button style to show success
        copyBtn.style.backgroundColor = '#34a853';  // Green color
        copyBtn.textContent = 'Copied!';
        
        // Reset button after 1.5 seconds
        setTimeout(() => {
            copyBtn.style.backgroundColor = '';
            copyBtn.textContent = 'Copy';
        }, 1500);
    }).catch(err => {
        console.error('Failed to copy:', err);
        copyBtn.style.backgroundColor = '#ea4335';  // Red color
        copyBtn.textContent = 'Failed';
        
        setTimeout(() => {
            copyBtn.style.backgroundColor = '';
            copyBtn.textContent = 'Copy';
        }, 1500);
    });
}

// Add screenshot preview handler
document.getElementById('screenshotInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('screenshotPreview');
            preview.innerHTML = `
                <img src="${e.target.result}" alt="Payment Screenshot">
                <button class="remove-screenshot" onclick="removeScreenshot()">
                    <i class="fas fa-times"></i>
                </button>
            `;
            preview.style.display = 'block';
        }
        reader.readAsDataURL(file);
    }
});

function removeScreenshot() {
    document.getElementById('screenshotInput').value = '';
    document.getElementById('screenshotPreview').innerHTML = '';
    document.getElementById('screenshotPreview').style.display = 'none';
}


// Modify the submitUTR function
async function submitUTR() {
    const utrNumber = document.getElementById('utrNumber').value.trim();
    const screenshotInput = document.getElementById('screenshotInput');
    const submitBtn = document.querySelector('.submit-btn');

    if (!utrNumber) {
        showInfo('Please enter your UTR/Reference number');
        return;
    }
    if (!/^\d+$/.test(utrNumber)) {
        showInfo('UTR number should contain only numbers');
        return;
    }
    if (utrNumber.length !== 12) {
        showInfo('Please enter a valid 12-digit UTR number');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Verifying Payment...';

    // Create a FormData object to send the UTR and optional screenshot
    const formData = new FormData();
    formData.append('utr', utrNumber);
    formData.append('amount', amount);
    if (screenshotInput.files.length > 0) {
        formData.append('screenshot', screenshotInput.files[0]);
    }

    try {
        // Send data to our secure backend API
        const response = await fetch('https://bcplay.win/api/verify-payment', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('The server returned an error.');
        }

        const result = await response.json();

        // Handle the response from our server
        if (result.isSuccess) {
            showSuccessAnimation();
        } else {
            showInfo(`
                <div class="verification-status">
                    <i class="fas fa-info-circle"></i>
                    <div class="status-details">
                        <p>Payment verification in progress</p>
                        <ul>
                            <li>If you have just made the payment, please wait 2-3 minutes and try again</li>
                            <li>Make sure you have entered the correct UTR number</li>
                            <li>Ensure you have paid the exact amount: ₹${amount}</li>
                        </ul>
                        <p class="support-note">Need assistance? Contact our support team</p>
                    </div>
                </div>
            `);
        }
    } catch (error) {
        console.error('Submission Error:', error);
        showInfo('Our servers are a bit busy. Please try again in a moment.');
    } finally {
        // Only re-enable the button if the payment did NOT succeed
        const successAnimationExists = document.querySelector('.success-animation');
        if (!successAnimationExists) {
             submitBtn.disabled = false;
             submitBtn.textContent = 'Verify Payment';
        }
    }
}

function simulateServerCheck(utrNumber) {
    return new Promise((resolve) => {
        const randomDelay = Math.floor(Math.random() * (3000 - 1500 + 1) + 1500);
        setTimeout(() => {
            resolve();
        }, randomDelay);
    });
}

function showInfo(message) {
    const infoDiv = document.createElement('div');
    infoDiv.className = 'info-message';
    infoDiv.innerHTML = message;
    
    const existingInfo = document.querySelector('.info-message');
    if (existingInfo) {
        existingInfo.remove();
    }
    
    const submitBtn = document.querySelector('.submit-btn');
    submitBtn.parentNode.insertBefore(infoDiv, submitBtn.nextSibling);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    
    const existingSuccess = document.querySelector('.success-message');
    if (existingSuccess) {
        existingSuccess.remove();
    }
    
    const submitBtn = document.querySelector('.submit-btn');
    submitBtn.parentNode.insertBefore(successDiv, submitBtn.nextSibling);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

function showSuccessAnimation() {
    const depositCard = document.querySelector('.deposit-card');
    depositCard.innerHTML = `
        <div class="success-animation">
            <div class="celebration">
                ${Array(50).fill().map((_, i) => `
                    <div class="confetti" style="
                        left: ${Math.random() * 100}%;
                        animation-delay: ${Math.random() * 3}s;
                        background: ${['#1a73e8', '#fbbc04', '#ea4335', '#34a853'][i % 4]};
                    "></div>
                `).join('')}
            </div>
            <div class="success-content">
                <div class="success-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h2>Payment Successful!</h2>
                <div class="success-amount-wrapper">
                    <span class="amount-label">Amount Paid</span>
                    <p class="success-amount">₹${amount}</p>
                </div>
                <div class="success-message-details">
                    <p class="congrats-text">Congratulations! 🎉</p>
                    <p>Your benefits have been activated</p>
                </div>
                <div class="success-footer">
                    <p>Thank you for your payment!</p>
                    <small>Transaction ID: ${Date.now()}</small>
                </div>
            </div>
        </div>
    `;
}

// Add this function
function openApp(app) {
    const upiId = document.getElementById('upiId').textContent;
    const payeeName = document.getElementById('upiName').textContent.replace('Receiver: ', '');
    let url;

    switch(app) {
        case 'phonepe':
            url = `phonepe://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR`;
            break;
        case 'gpay':
            url = `tez://upi/pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR`;
            break;
        case 'paytm':
            url = `paytmmp://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR`;
            break;
    }

    // Try to open the app
    window.location.href = url;

    // Fallback for desktop or if app is not installed
    setTimeout(() => {
        const fallbackUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR`;
        window.location.href = fallbackUrl;
    }, 1000);
}

// Initialize
fetchUpiId();
fetchSuccessUTRs(); 