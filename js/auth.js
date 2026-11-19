let currentUser = null; // null (Guest), 'Super User', 'Admin'

function openLoginModal() {
  if (currentUser) {
    handleLogout();
    return;
  }
  document.getElementById("loginModal").classList.remove("hidden");
  document.getElementById("loginError").classList.add("hidden");
}

function closeLoginModal() {
  document.getElementById("loginModal").classList.add("hidden");
}

function handleLogin(e) {
  e.preventDefault();
  const u = document.getElementById("username").value.trim();
  const p = document.getElementById("password").value.trim();

  if ((u === "superuser" || u === "admin") && p === "123") {
    currentUser = u === "admin" ? "Admin" : "Super User";
    closeLoginModal();

    document.getElementById("roleBadge").classList.remove("hidden");
    document.getElementById("roleText").innerText = `Role: ${currentUser}`;
    document.getElementById("authBtnText").innerText = "Keluar (Logout)";

    document.getElementById("publicView").classList.add("hidden");
    document.getElementById("internalView").classList.remove("hidden");

    switchTab("mapTab");
  } else {
    document.getElementById("loginError").classList.remove("hidden");
  }
}

function handleLogout() {
  currentUser = null;
  document.getElementById("roleBadge").classList.add("hidden");
  document.getElementById("authBtnText").innerText = "Masuk (Login Demo)";

  document.getElementById("publicView").classList.remove("hidden");
  document.getElementById("internalView").classList.add("hidden");

  setTimeout(() => {
    if (publicMap) publicMap.invalidateSize();
  }, 150);
}
