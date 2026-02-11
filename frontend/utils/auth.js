// Auth utility functions
export function getToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
}

export function setToken(token) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
  }
}

export function removeToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  }
}

export function getUser() {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        return null;
      }
    }
  }
  return null;
}

export function setUser(user) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user));
  }
}

export function hasPermission(user, permission) {
  if (!user || !user.permissions) return false;
  if (user.permissions.all === true) return true;
  return user.permissions[permission] === true;
}

export function canAccess(user, resource) {
  if (!user || !user.permissions) return false;
  if (user.permissions.all === true) return true;
  // Check specific resource permission
  if (user.permissions[resource] === true) return true;
  // For view-only users, check if they have view permission
  // View permission allows viewing leads, submissions, reports
  if (user.permissions.view === true) {
    // View-only users can see leads, submissions, reports for viewing
    if (['leads', 'submissions', 'reports'].includes(resource)) {
      return true;
    }
  }
  return false;
}

export function canEdit(user, resource) {
  if (!user || !user.permissions) return false;
  if (user.permissions.all === true) return true;
  // Check specific resource permission (not just view)
  if (user.permissions[resource] === true) {
    // If they have view permission but resource is false, they can't edit
    if (user.permissions.view === true && user.permissions[resource] === false) {
      return false;
    }
    return true;
  }
  return false;
}

