// /src/api/auth.header.js
export default function authHeader() {
    const user = JSON.parse(localStorage.getItem('user'));

    if (user && user.accessToken) {
        // Cho các request (giống trong middleware của Express)
        return { Authorization: 'Bearer ' + user.accessToken };
    } else {
        return {};
    }
}