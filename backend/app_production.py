"""
CORRUGATED CARTON COSTING SYSTEM - PRODUCTION BACKEND (CORRECTED)
Flask API with simplified rates and corrected overhead logic
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import os
import json
from dotenv import load_dotenv

# Import calculation engine
import sys
sys.path.insert(0, os.path.dirname(__file__))
from calculation_engine import CostingCalculator, CostingParameters

load_dotenv()

def safe_float(val, default=0.0):
    if val is None or str(val).strip() == '':
        return default
    try:
        return float(val)
    except ValueError:
        return default

def safe_int(val, default=0):
    if val is None or str(val).strip() == '':
        return default
    try:
        return int(val)
    except ValueError:
        return default

# ============================================================================
# FLASK APP SETUP
# ============================================================================

app = Flask(__name__)

# ── CORS ─────────────────────────────────────────────────────────────────────
# Allow local dev + Render frontend (set FRONTEND_URL env var on Render)
_frontend_url = os.getenv('FRONTEND_URL', '')
_allowed_origins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
]
if _frontend_url:
    _allowed_origins.append(_frontend_url.rstrip('/'))

CORS(app, origins=_allowed_origins, supports_credentials=True)

# ── Database ──────────────────────────────────────────────────────────────────
# Render provides DATABASE_URL as postgres://... but SQLAlchemy needs postgresql://
_db_url = os.getenv('DATABASE_URL', 'sqlite:///carton_costing.db')
if _db_url.startswith('postgres://'):
    _db_url = _db_url.replace('postgres://', 'postgresql://', 1)

app.config['SQLALCHEMY_DATABASE_URI'] = _db_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

db = SQLAlchemy(app)
jwt = JWTManager(app)

# ============================================================================
# DATABASE MODELS - CORRECTED
# ============================================================================

class User(db.Model):
    """User model"""
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(120), unique=True)
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Customer(db.Model):
    """Customer model"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(120))
    phone = db.Column(db.String(20))
    location = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    quotes = db.relationship('Quote', backref='customer', lazy=True)


class Quote(db.Model):
    """Quote model - CORRECTED VERSION"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customer.id'))
    
    # Customer info
    customer_name = db.Column(db.String(200), nullable=False)
    
    # Dimensions
    carton_length_mm = db.Column(db.Float, nullable=False)
    carton_width_mm = db.Column(db.Float, nullable=False)
    carton_height_mm = db.Column(db.Float, nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    
    # Material specifications
    ply_type = db.Column(db.String(20), nullable=False)
    board_type = db.Column(db.String(20), nullable=False)
    flute_type = db.Column(db.String(20), nullable=False)  # CORRECTED: added flute type
    joining_type = db.Column(db.String(20), nullable=False)
    is_printed = db.Column(db.Boolean, default=False)
    
    # Sheet dimensions (calculated)
    sheet_length_mm = db.Column(db.Float)
    sheet_width_mm = db.Column(db.Float)
    board_area_m2 = db.Column(db.Float)
    selected_reel_mm = db.Column(db.Float)
    sheets_per_reel = db.Column(db.Integer)
    reel_waste_mm = db.Column(db.Float)
    
    # Material values
    total_gsm = db.Column(db.Float)
    weight_per_sheet_kg = db.Column(db.Float)
    gsm_values = db.Column(db.String(500))  # JSON string
    
    # 2 Rates
    white_liner_rate = db.Column(db.Float)
    brown_liner_rate = db.Column(db.Float)
    
    # Per-carton costs
    rm_cost_per_carton = db.Column(db.Float)
    overhead_per_carton = db.Column(db.Float)
    total_overhead_for_order = db.Column(db.Float)
    joining_cost = db.Column(db.Float)
    print_cost = db.Column(db.Float, default=0)
    slotting_cost = db.Column(db.Float, default=0)
    bundling_cost = db.Column(db.Float, default=0)
    diecutting_cost = db.Column(db.Float, default=0)
    
    # Calculated costs
    subtotal_per_carton = db.Column(db.Float)
    profit_margin_percent = db.Column(db.Float)
    profit_per_carton = db.Column(db.Float)
    cost_with_profit_per_carton = db.Column(db.Float)
    
    # Transport & Commissions
    delivery_required = db.Column(db.Boolean, default=False)
    delivery_location = db.Column(db.String(200))
    distance_km = db.Column(db.Float, default=0)
    transport_per_carton = db.Column(db.Float, default=0)
    has_inhouse_commission = db.Column(db.Boolean, default=False)
    has_third_party_commission = db.Column(db.Boolean, default=False)
    third_party_commission = db.Column(db.Float, default=0.0)
    has_transport = db.Column(db.Boolean, default=False)
    transport_cost = db.Column(db.Float, default=0.0)
    
    # Tax
    tax_type = db.Column(db.String(50), nullable=False)
    tax_amount_per_carton = db.Column(db.Float, default=0)
    
    # Final
    final_cost_per_carton = db.Column(db.Float)
    total_cost_batch = db.Column(db.Float)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    quote_date = db.Column(db.Date, default=datetime.utcnow)


class SystemParameter(db.Model):
    """System parameters"""
    id = db.Column(db.Integer, primary_key=True)
    parameter_name = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.String(500), nullable=False)
    description = db.Column(db.String(500))
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ============================================================================
# API ENDPOINTS - AUTHENTICATION
# ============================================================================

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register new user"""
    try:
        data = request.get_json()
        
        if User.query.filter_by(username=data.get('username')).first():
            return jsonify({'error': 'Username already exists'}), 400
        
        user = User(username=data.get('username'), email=data.get('email'))
        user.set_password(data.get('password'))
        db.session.add(user)
        db.session.commit()
        
        return jsonify({'message': 'User registered successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.get_json()
        user = User.query.filter_by(username=data.get('username')).first()
        
        if not user or not user.check_password(data.get('password')):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        access_token = create_access_token(identity=str(user.id))
        return jsonify({
            'access_token': access_token,
            'user': {'id': user.id, 'username': user.username, 'is_admin': user.is_admin}
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400


# ============================================================================
# API ENDPOINTS - CALCULATION
# ============================================================================

@app.route('/api/quotes/calculate', methods=['POST'])
@jwt_required()
def calculate_cost():
    """Calculate carton costing - CORRECTED"""
    try:
        data = request.get_json()
        
        # Parse GSM values
        gsm_values = data.get('gsm_values', [])
        if isinstance(gsm_values, str):
            gsm_values = json.loads(gsm_values)
        gsm_values = [safe_float(v) for v in gsm_values]
        
        # Query parameters from database (defaulting if not found)
        sscl_param = SystemParameter.query.filter_by(parameter_name='sscl_rate').first()
        sscl_rate = safe_float(sscl_param.value) if sscl_param else 2.125

        vat_param = SystemParameter.query.filter_by(parameter_name='vat_rate').first()
        vat_rate = safe_float(vat_param.value) if vat_param else 18.0

        input_tax_param = SystemParameter.query.filter_by(parameter_name='input_tax_rate').first()
        input_tax_rate = safe_float(input_tax_param.value) if input_tax_param else 18.0

        trans_param = SystemParameter.query.filter_by(parameter_name='transport_rate_per_km').first()
        transport_rate = safe_float(trans_param.value) if trans_param else 10.0
        
        # Create parameters with corrected logic
        params = CostingParameters(
            carton_length_mm=safe_float(data.get('carton_length_mm')),
            carton_width_mm=safe_float(data.get('carton_width_mm')),
            carton_height_mm=safe_float(data.get('carton_height_mm')),
            quantity=safe_int(data.get('quantity')),
            ply_type=data.get('ply_type'),
            board_type=data.get('board_type'),
            flute_type=data.get('flute_type'),
            joining_type=data.get('joining_type'),
            is_printed=data.get('is_printed', False),
            white_liner_rate=safe_float(data.get('white_liner_rate', 0)),
            brown_liner_rate=safe_float(data.get('brown_liner_rate', 0)),
            gsm_values=gsm_values,
            total_overhead_for_order=safe_float(data.get('total_overhead_for_order', 0)),
            joining_cost=safe_float(data.get('joining_cost', 0)),
            print_cost=safe_float(data.get('print_cost', 0)) if data.get('is_printed') else 0,
            slotting_cost=safe_float(data.get('slotting_cost', 0)),
            bundling_cost=safe_float(data.get('bundling_cost', 0)),
            diecutting_cost=safe_float(data.get('diecutting_cost', 0)),
            profit_margin_percent=safe_float(data.get('profit_margin_percent', 15)),
            tax_type=data.get('tax_type', 'Non-VAT, Inhouse'),
            sscl_rate=sscl_rate,
            vat_rate=vat_rate,
            input_tax_rate=input_tax_rate,
            has_inhouse_commission=data.get('hasInhouseCommission', False),
            has_third_party_commission=data.get('hasThirdPartyCommission', False),
            third_party_commission=safe_float(data.get('thirdPartyCommission', 0)),
            has_transport=data.get('hasTransport', False),
            transport_cost=safe_float(data.get('transportCost', 0)),
        )
        
        # Calculate
        calculator = CostingCalculator(params)
        results = calculator.calculate()
        
        return jsonify(results), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/quotes/save', methods=['POST'])
@jwt_required()
def save_quote():
    """Save quote to database - CORRECTED"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        # Get or create customer
        customer = Customer.query.filter_by(name=data.get('customerName')).first()
        if not customer:
            customer = Customer(name=data.get('customerName'))
            db.session.add(customer)
            db.session.flush()
        
        # Parse GSM values
        gsm_values = data.get('gsm_values', [])
        if isinstance(gsm_values, str):
            gsm_values = json.loads(gsm_values)
        
        # Calculate overhead per carton
        total_overhead = safe_float(data.get('totalOverheadForOrder', 0))
        quantity = safe_int(data.get('quantity', 1))
        overhead_per_carton = total_overhead / quantity if quantity > 0 else 0
        
        # Create quote
        quote = Quote(
            user_id=user_id,
            customer_id=customer.id,
            customer_name=data.get('customerName'),
            carton_length_mm=safe_float(data.get('cartonLength')),
            carton_width_mm=safe_float(data.get('cartonWidth')),
            carton_height_mm=safe_float(data.get('cartonHeight')),
            quantity=quantity,
            ply_type=data.get('plyType'),
            board_type=data.get('boardType'),
            flute_type=data.get('fluteType'),
            joining_type=data.get('joiningType'),
            is_printed=data.get('isPrinted', False),
            gsm_values=json.dumps(gsm_values),
            white_liner_rate=safe_float(data.get('whiteLinerRate', 0)),
            brown_liner_rate=safe_float(data.get('brownLinerRate', 0)),
            total_overhead_for_order=total_overhead,
            overhead_per_carton=overhead_per_carton,
            joining_cost=safe_float(data.get('joiningCost', 0)),
            print_cost=safe_float(data.get('printCost', 0)),
            slotting_cost=safe_float(data.get('slottingCost', 0)),
            bundling_cost=safe_float(data.get('bundlingCost', 0)),
            diecutting_cost=safe_float(data.get('diecuttingCost', 0)),
            profit_margin_percent=safe_float(data.get('profitMargin', 15)),
            tax_type=data.get('taxType'),
            delivery_required=data.get('deliveryRequired', False),
            delivery_location=data.get('deliveryLocation'),
            distance_km=safe_float(data.get('distanceKm', 0)),
            has_inhouse_commission=data.get('hasInhouseCommission', False),
            has_third_party_commission=data.get('hasThirdPartyCommission', False),
            third_party_commission=safe_float(data.get('thirdPartyCommission', 0)),
            has_transport=data.get('hasTransport', False),
            transport_cost=safe_float(data.get('transportCost', 0)),
        )
        
        # Add calculated costs if provided
        if 'calculated_cost' in data:
            calc = data['calculated_cost']
            quote.rm_cost_per_carton = calc.get('rates', {}).get('rm_cost_per_carton')
            quote.final_cost_per_carton = calc.get('final', {}).get('final_cost_per_carton')
            quote.total_cost_batch = calc.get('final', {}).get('total_cost_batch')
            quote.subtotal_per_carton = calc.get('per_carton_costs', {}).get('subtotal')
            quote.profit_per_carton = calc.get('profit', {}).get('profit_amount')
            quote.transport_per_carton = calc.get('transport', {}).get('transport_per_carton')
            quote.tax_amount_per_carton = calc.get('tax', {}).get('tax_amount_per_carton')
            
            # Save calculated sheet specifications
            sheet_dims = calc.get('sheet_dimensions', {})
            quote.sheet_length_mm = sheet_dims.get('sheet_length_mm')
            quote.sheet_width_mm = sheet_dims.get('sheet_width_mm')
            quote.board_area_m2 = sheet_dims.get('board_area_m2')
            quote.selected_reel_mm = sheet_dims.get('selected_reel_mm')
            quote.sheets_per_reel = sheet_dims.get('sheets_per_reel')
            quote.reel_waste_mm = sheet_dims.get('reel_waste_mm')
        
        db.session.add(quote)
        db.session.commit()
        
        return jsonify({'id': quote.id, 'quote_no': f"QT-{str(quote.id).zfill(5)}", 'message': 'Quote saved successfully'}), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@app.route('/api/quotes/history', methods=['GET'])
@jwt_required()
def get_quote_history():
    """Get quote history"""
    try:
        user_id = int(get_jwt_identity())
        quotes = Quote.query.filter_by(user_id=user_id).order_by(Quote.created_at.desc()).all()
        
        result = []
        for quote in quotes:
            result.append({
                'id': quote.id,
                'quote_no': f"QT-{str(quote.id).zfill(5)}",
                'customer_name': quote.customer_name,
                'dimensions': f"{quote.carton_length_mm}×{quote.carton_width_mm}×{quote.carton_height_mm}",
                'ply_type': quote.ply_type,
                'quantity': quote.quantity,
                'final_cost_per_carton': quote.final_cost_per_carton,
                'total_cost_batch': quote.total_cost_batch,
                'created_at': quote.created_at.isoformat() + 'Z'
            })
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/quotes/<int:quote_id>', methods=['GET'])
@jwt_required()
def get_quote(quote_id):
    """Get specific quote"""
    try:
        user_id = int(get_jwt_identity())
        quote = Quote.query.filter_by(id=quote_id, user_id=user_id).first()
        
        if not quote:
            return jsonify({'error': 'Quote not found'}), 404
        
        return jsonify({
            'id': quote.id,
            'quote_no': f"QT-{str(quote.id).zfill(5)}",
            'customer_name': quote.customer_name,
            'carton_length_mm': quote.carton_length_mm,
            'carton_width_mm': quote.carton_width_mm,
            'carton_height_mm': quote.carton_height_mm,
            'quantity': quote.quantity,
            'ply_type': quote.ply_type,
            'board_type': quote.board_type,
            'flute_type': quote.flute_type,
            'joining_type': quote.joining_type,
            'is_printed': quote.is_printed,
            'gsm_values': json.loads(quote.gsm_values) if quote.gsm_values else [],
            'white_liner_rate': quote.white_liner_rate,
            'brown_liner_rate': quote.brown_liner_rate,
            'total_overhead_for_order': quote.total_overhead_for_order,
            'joining_cost': quote.joining_cost,
            'print_cost': quote.print_cost,
            'slotting_cost': quote.slotting_cost,
            'bundling_cost': quote.bundling_cost,
            'diecutting_cost': quote.diecutting_cost,
            'profit_margin_percent': quote.profit_margin_percent,
            'tax_type': quote.tax_type,
            'delivery_required': quote.delivery_required,
            'delivery_location': quote.delivery_location,
            'distance_km': quote.distance_km,
            'has_inhouse_commission': quote.has_inhouse_commission,
            'has_third_party_commission': quote.has_third_party_commission,
            'third_party_commission': quote.third_party_commission,
            'has_transport': quote.has_transport,
            'transport_cost': quote.transport_cost,
            'rm_cost_per_carton': quote.rm_cost_per_carton,
            'profit_per_carton': quote.profit_per_carton,
            'tax_amount_per_carton': quote.tax_amount_per_carton,
            'subtotal_per_carton': quote.subtotal_per_carton,
            'dimensions': {
                'length_mm': quote.carton_length_mm,
                'width_mm': quote.carton_width_mm,
                'height_mm': quote.carton_height_mm
            },
            'sheet_dimensions': {
                'sheet_length_mm': quote.sheet_length_mm,
                'sheet_width_mm': quote.sheet_width_mm,
                'board_area_m2': quote.board_area_m2,
                'selected_reel_mm': quote.selected_reel_mm,
                'sheets_per_reel': quote.sheets_per_reel,
                'reel_waste_mm': quote.reel_waste_mm
            },
            'final_cost_per_carton': quote.final_cost_per_carton,
            'total_cost_batch': quote.total_cost_batch
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400


# ============================================================================
# API ENDPOINTS - ADMIN
# ============================================================================

@app.route('/api/admin/parameters', methods=['GET'])
@jwt_required()
def get_parameters():
    """Get system parameters"""
    try:
        params = SystemParameter.query.all()
        result = {p.parameter_name: p.value for p in params}
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/admin/parameters/<param_name>', methods=['PUT'])
@jwt_required()
def update_parameter(param_name):
    """Update system parameter"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        param = SystemParameter.query.filter_by(parameter_name=param_name).first()
        
        if not param:
            param = SystemParameter(parameter_name=param_name)
            db.session.add(param)
        
        param.value = data.get('value')
        db.session.commit()
        
        return jsonify({'message': 'Parameter updated'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Internal server error'}), 500


# ============================================================================
# DATABASE INITIALIZATION
# ============================================================================

def init_db():
    """Initialize database"""
    with app.app_context():
        db.create_all()
        
        # Create admin user
        if not User.query.filter_by(username='admin').first():
            admin = User(username='admin', email='admin@example.com', is_admin=True)
            admin.set_password('admin123')
            db.session.add(admin)
        
        # Create default parameters
        default_params = [
            ('profit_margin_percent', '15', 'Default profit margin %'),
            ('vat_rate', '18', 'VAT rate %'),
            ('sscl_rate', '2.125', 'SSCL rate %'),
            ('input_tax_rate', '18', 'Input tax rate % for Non-VAT customers'),
            ('transport_rate_per_km', '10', 'Transport cost per km'),
            ('waste_allowance_percent', '3', 'Waste allowance %'),
        ]
        
        for param_name, value, description in default_params:
            if not SystemParameter.query.filter_by(parameter_name=param_name).first():
                param = SystemParameter(parameter_name=param_name, value=value, description=description)
                db.session.add(param)
        
        db.session.commit()


if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)
