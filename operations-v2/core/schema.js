window.NE_CORE_SCHEMA = {
  version: '2.0.0',
  timezone: 'Asia/Kolkata',
  idFormats: {
    inward: 'INW-YYMMDD-###',
    batch: 'BAT-YYMMDD-###',
    bunchBarcode: 'NE-YYMMDD-###-###',
    order: 'ORD-CHANNEL-YYMMDD-####',
    allocation: 'ALC-YYMMDD-####',
    trip: 'TRIP-YYMMDD-###',
    movement: 'MOV-YYMMDD-#####',
    delivery: 'DLV-YYMMDD-####',
    return: 'RET-YYMMDD-####',
    employee: 'EMP-####'
  },
  tables: {
    EMPLOYEES: ['employee_id','name','phone','role','pin_hash','status','home_location','vehicle_id','created_at','updated_at'],
    LOCATIONS: ['location_id','location_name','location_type','address','lat','lng','status','created_at'],
    SUPPLIERS: ['supplier_id','supplier_name','phone','source_type','location_id','status','created_at'],
    PRODUCTS: ['product_id','product_name','category','unit','status','created_at'],
    INWARDS: ['inward_id','supplier_id','supplier_name','product_id','inward_date','vehicle_ref','total_qty','bunch_count','location_id','notes','status','created_by','created_at'],
    BATCHES: ['batch_id','inward_id','product_id','original_qty','available_qty','reserved_qty','picked_qty','loaded_qty','delivered_qty','damaged_qty','returned_qty','status','created_at'],
    BUNCHES: ['barcode','batch_id','inward_id','bunch_no','product_id','original_qty','available_qty','reserved_qty','picked_qty','loaded_qty','delivered_qty','damaged_qty','returned_qty','location_id','status','created_at','updated_at'],
    ORDERS: ['order_id','channel','source_order_id','customer_id','customer_name','customer_phone','delivery_address','delivery_lat','delivery_lng','order_qty','order_value','payment_type','status','priority','created_at','updated_at'],
    ORDER_LINES: ['order_line_id','order_id','product_id','ordered_qty','allocated_qty','picked_qty','loaded_qty','delivered_qty','returned_qty','status'],
    ALLOCATIONS: ['allocation_id','order_id','order_line_id','barcode','allocated_qty','status','allocated_by','allocated_at','picked_by','picked_at'],
    TRIPS: ['trip_id','trip_type','driver_id','driver_name','vehicle_id','vehicle_no','route_date','start_odometer','end_odometer','start_time','end_time','status','created_by','created_at'],
    TRIP_ORDERS: ['trip_id','order_id','stop_no','sequence','status','loaded_at','arrived_at','delivered_at'],
    DELIVERIES: ['delivery_id','trip_id','order_id','driver_id','status','delivered_qty','failed_qty','otp_verified','proof_url','recipient_name','failure_reason','notes','delivered_at'],
    RETURNS: ['return_id','order_id','trip_id','barcode','qty','return_type','reason','destination_location_id','status','created_by','created_at'],
    DAMAGES: ['damage_id','barcode','qty','reason','location_id','photo_url','created_by','created_at'],
    STOCK_LEDGER: ['movement_id','barcode','product_id','order_id','trip_id','action','qty','from_location','to_location','status_before','status_after','employee_id','employee_name','timestamp','reference_type','reference_id','notes'],
    VEHICLES: ['vehicle_id','vehicle_no','vehicle_type','capacity','driver_id','status','created_at'],
    VENDORS: ['vendor_id','business_name','owner_name','phone','address','lat','lng','onboarding_status','approval_status','created_at'],
    AUDIT_LOG: ['audit_id','entity_type','entity_id','action','before_json','after_json','employee_id','timestamp']
  },
  statuses: {
    bunch: ['AVAILABLE','RESERVED','PICKED','LOADED','IN_TRANSIT','PARTIAL','DELIVERED','RETURNED','DAMAGED','CLOSED'],
    order: ['NEW','ALLOCATED','PICKING','PICKED','LOADING','DISPATCHED','OUT_FOR_DELIVERY','PARTIAL','DELIVERED','FAILED','CANCELLED','RETURNED'],
    trip: ['PLANNED','LOADING','READY','STARTED','IN_PROGRESS','COMPLETED','CANCELLED'],
    employee: ['ACTIVE','INACTIVE','BLOCKED'],
    vendor: ['NEW','PENDING_APPROVAL','APPROVED','REJECTED','SUSPENDED']
  },
  stockActions: ['INWARD','MOVE','RESERVE','UNRESERVE','PICK','UNPICK','LOAD','UNLOAD','DISPATCH','DELIVER','RETURN','DAMAGE','ADJUSTMENT','TRANSFER'],
  invariants: [
    'available_qty + reserved_qty + picked_qty + loaded_qty + delivered_qty + damaged_qty must never exceed original_qty except through an explicit adjustment',
    'every stock-changing action must create exactly one STOCK_LEDGER record',
    'a barcode identifies one physical bunch for its entire lifecycle',
    'FIFO allocation sorts by inward_date then created_at unless Admin overrides with a recorded reason',
    'delivery cannot exceed loaded quantity for an order allocation',
    'damage and return quantities cannot exceed the physical balance of the barcode'
  ]
};
