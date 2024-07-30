let tapLimit = TAP_LIMIT_MAX;
let totalCoins = 0;
let lastTapTime = null;
let updateBalanceTimeout = null;
let speed = null;

const counterElement = document.querySelector('.counter');
const totalCoinsElement = document.querySelector('.total-coins');
const coinImageElement = document.querySelector('.coin-container img');

const tgWebApp = window.Telegram.WebApp;  // import Telegram lib

tgWebApp.ready();  // wait to be fully loaded
tgWebApp.expand();  // fully open window after launch

// change secondary bg color based on theme
function setSecBgColor() {
    const theme = tgWebApp.colorScheme;
    if (theme === 'dark') {
        document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', 'rgb(12, 36, 97)');
    } else if (theme === 'light') {
        document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', 'rgb(74, 105, 189)');
    }
}
setSecBgColor();
tgWebApp.onEvent('themeChanged', setSecBgColor);

// get user unique ID (guid) and store in local storage
const userID = tgWebApp.initDataUnsafe?.user?.id.toString();
window.sessionStorage.setItem('userID', userID);

// retrieve user's total coins balance from database
fetch(`${BASE_URL}/get_balance?guid=` + encodeURIComponent(userID), {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({'guid': userID})
})
.then(response => response.json())
.then(data => {
    if (typeof data.balance !== 'undefined') {
        totalCoins = parseInt(data.balance, 10);
        totalCoinsElement.textContent = totalCoins.toString();
        window.sessionStorage.setItem('referralCode', data.ref_code);  // store ref_code to access via referral script
        window.sessionStorage.setItem('totalCoins', totalCoins);  // store totalCoins to access via boosters script
        speed = parseInt(data.speed, 10);
    } else {
        console.error('Error:', data.error);
    }
})

// increment balance every 5 secs
function checkAndIncrement(){
    if (tapLimit < TAP_LIMIT_MAX) {
        tapLimit ++;
        counterElement.textContent = tapLimit.toString();
    }
    setTimeout(checkAndIncrement, TAP_INCREMENT_INTERVAL);
}

coinImageElement.addEventListener('click', () => {
    coinImageElement.style.transform = 'translate(-50%, -50%) scale(0.95)';
    setTimeout(() => {
        coinImageElement.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 100);

    // decrement limit with each tap & increment total coins, unless it is 0
    if (tapLimit > (speed - 1)) {
        tapLimit = tapLimit - speed;
        counterElement.textContent = tapLimit.toString();
        totalCoins = totalCoins + speed;
        totalCoinsElement.textContent = totalCoins.toString();
    }

    lastTapTime = Date.now();  // update last tap time

    // clear previous timeout and set a new one
    clearTimeout(updateBalanceTimeout);
    updateBalanceTimeout = setTimeout(() => {
        if (Date.now() - lastTapTime >= BALANCE_UPDATE_DELAY) {
            // send AJAX request to update balance on the server
            fetch(`${BASE_URL}/tap`, {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: new URLSearchParams({guid: userID, balance: totalCoins.toString(), speed: speed.toString()})
            });
            window.sessionStorage.setItem('totalCoins', totalCoins);  // update totalCoins in local storage
        }
    }, BALANCE_UPDATE_DELAY);  // update coin balance after 1 second of inactivity
});

// run incrementation function
checkAndIncrement();
