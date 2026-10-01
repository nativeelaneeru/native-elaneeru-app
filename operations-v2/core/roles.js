window.NE_CORE_ROLES = {
  version: '2.0.0',
  permissions: [
    'dashboard.view','employees.manage','vendors.view','vendors.manage','suppliers.view','suppliers.manage','inward.create','inward.view','barcode.create','barcode.print','inventory.view','inventory.adjust','inventory.transfer','orders.view','orders.allocate','picking.view','picking.confirm','dispatch.view','dispatch.load','dispatch.assign_driver','trips.view','trips.start','trips.complete','delivery.view','delivery.confirm','delivery.fail','returns.create','returns.receive','damage.create','reports.view','audit.view','settings.manage'
  ],
  roles: {
    SUPER_ADMIN: {
      label: 'Super Admin',
      apps: ['admin','warehouse','picker','driver-b2b','delivery-b2c','vendor-onboarding','vendor-approval'],
      permissions: ['*']
    },
    ADMIN: {
      label: 'Admin',
      apps: ['admin','warehouse','picker','driver-b2b','delivery-b2c','vendor-onboarding','vendor-approval'],
      permissions: ['dashboard.view','employees.manage','vendors.view','vendors.manage','suppliers.view','suppliers.manage','inward.create','inward.view','barcode.create','barcode.print','inventory.view','inventory.adjust','inventory.transfer','orders.view','orders.allocate','picking.view','picking.confirm','dispatch.view','dispatch.load','dispatch.assign_driver','trips.view','delivery.view','returns.receive','damage.create','reports.view','audit.view','settings.manage']
    },
    WAREHOUSE: {
      label: 'Warehouse',
      apps: ['warehouse'],
      permissions: ['dashboard.view','suppliers.view','inward.create','inward.view','barcode.create','barcode.print','inventory.view','inventory.transfer','orders.view','picking.view','dispatch.view','returns.receive','damage.create']
    },
    PICKER: {
      label: 'Picker',
      apps: ['picker'],
      permissions: ['dashboard.view','inventory.view','orders.view','picking.view','picking.confirm']
    },
    DISPATCHER: {
      label: 'Dispatcher',
      apps: ['warehouse'],
      permissions: ['dashboard.view','inventory.view','orders.view','dispatch.view','dispatch.load','dispatch.assign_driver','trips.view','returns.receive']
    },
    B2B_DRIVER: {
      label: 'B2B Driver',
      apps: ['driver-b2b'],
      permissions: ['dashboard.view','trips.view','trips.start','trips.complete','delivery.view','delivery.confirm','delivery.fail','returns.create']
    },
    B2C_DELIVERY: {
      label: 'B2C Delivery',
      apps: ['delivery-b2c'],
      permissions: ['dashboard.view','trips.view','trips.start','trips.complete','delivery.view','delivery.confirm','delivery.fail','returns.create']
    },
    VENDOR_ONBOARDING: {
      label: 'Vendor Onboarding',
      apps: ['vendor-onboarding'],
      permissions: ['dashboard.view','vendors.view','vendors.manage']
    },
    VENDOR_APPROVER: {
      label: 'Vendor Approver',
      apps: ['vendor-approval'],
      permissions: ['dashboard.view','vendors.view','vendors.manage','audit.view']
    },
    VIEWER: {
      label: 'Viewer',
      apps: ['admin'],
      permissions: ['dashboard.view','vendors.view','suppliers.view','inward.view','inventory.view','orders.view','trips.view','delivery.view','reports.view']
    }
  },
  appRoutes: {
    admin: '../admin-v2/',
    warehouse: '../operations-v2/',
    picker: '../picker-v2/',
    'driver-b2b': '../driver-v2/',
    'delivery-b2c': '../delivery-v2/',
    'vendor-onboarding': '../vendor-onboarding-v2/',
    'vendor-approval': '../vendor-approval-v2/'
  },
  can(role, permission) {
    const r=this.roles[String(role||'').toUpperCase()];
    return !!(r && (r.permissions.includes('*') || r.permissions.includes(permission)));
  }
};
