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
    carton_type = db.Column(db.String(50), default="RSC")  # RSC, Lock Type, Mail Type, Special Shape, S.F.
    die_length_mm = db.Column(db.Float, nullable=True, default=0.0)
    die_width_mm = db.Column(db.Float, nullable=True, default=0.0)
    dimension_unit = db.Column(db.String(10), default='mm')  # 'mm' or 'inches'
    carton_length_input = db.Column(db.String(50), nullable=True)
    carton_width_input = db.Column(db.String(50), nullable=True)
    carton_height_input = db.Column(db.String(50), nullable=True)
    die_length_input = db.Column(db.String(50), nullable=True)
    die_width_input = db.Column(db.String(50), nullable=True)
    ply_type = db.Column(db.String(20), nullable=False)
    board_type = db.Column(db.String(20), nullable=False)
    flute_type = db.Column(db.String(20), nullable=False)  # CORRECTED: added flute type
    flute_type_2 = db.Column(db.String(20), nullable=True)  # Flute type 2 for 5-Ply
    production_method = db.Column(db.String(20), default="In-house")  # In-house, Outsource
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
    transport_option = db.Column(db.String(100), default="Ex factory price from Biyagama factory ( No transport)")
    
    # Tax
    tax_type = db.Column(db.String(50), nullable=False)
    tax_amount_per_carton = db.Column(db.Float, default=0)
    
    # Final
    final_cost_per_carton = db.Column(db.Float)
    total_cost_batch = db.Column(db.Float)
    
    # Special One-Time Costs & Payment Terms
    die_making_cost = db.Column(db.Float, default=0.0)
    block_making_cost = db.Column(db.Float, default=0.0)
    one_time_transport_cost = db.Column(db.Float, default=0.0)
    payment_method = db.Column(db.String(100), default="Credit - 30 Days")
    items = db.Column(db.Text, nullable=True)  # JSON-encoded array of items for multi-item quotes
    print_name = db.Column(db.String(50), nullable=True)  # Print identification name (max 12 chars in UI)

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


def seed_or_update_default_users():
    """Ensure Admin, Manoj, and Kaushalya exist with specified credentials and authorities"""
    # Precomputed secure password hashes for default credentials
    admin_hash = os.getenv('ADMIN_PASSWORD_HASH', 'scrypt:32768:8:1$zhmVwXm3WTzYFZ44$01bc26227cb45b9f045dd4efe27b49a2dbe08ade7b5600c8b0084db0318851428bc197ea280e789ecaeeec0e1a575df289ba86ae73bf7e72db066b0fcc6db088')
    manoj_hash = os.getenv('MANOJ_PASSWORD_HASH', 'scrypt:32768:8:1$MX3qCHD2VjZFfGA4$279b5fc250e9cfc5ffd1c1bc1c14fc175970c325bc216568f53e8df909c67fb8c4680359ee323c79b2c676edb4c877d88255e9ab7cb707034d74ec70d14f421f')
    kaushi_hash = os.getenv('KAUSHALYA_PASSWORD_HASH', 'scrypt:32768:8:1$MVwYwLWkJV9tCMQu$7c06e024062e99238c7a8ef52be13397cacf1f51d19142f7db5edcdf25f338eddf3a7b9a4e1a5bcd9d41b4bb6a3e8e630ff8057dae8ef0b54abe42f37d95e426')

    users_config = [
        {
            'username': 'Admin',
            'password_hash': admin_hash,
            'email': 'admin@app.internal',
            'is_admin': True,
        },
        {
            'username': 'Manoj',
            'password_hash': manoj_hash,
            'email': 'manoj@app.internal',
            'is_admin': False,
        },
        {
            'username': 'Kaushalya',
            'password_hash': kaushi_hash,
            'email': 'kaushalya@app.internal',
            'is_admin': False,
        }
    ]
    for conf in users_config:
        try:
            u = User.query.filter(db.func.lower(User.username) == conf['username'].lower()).first()
            if not u:
                u = User(username=conf['username'], email=conf['email'], is_admin=conf['is_admin'])
                u.password_hash = conf['password_hash']
                db.session.add(u)
                db.session.commit()
            else:
                u.username = conf['username']
                u.is_admin = conf['is_admin']
                # Ensure default password is initialized once via SystemParameter
                param_key = f"init_pw_{conf['username'].lower()}_v1"
                init_param = SystemParameter.query.filter_by(parameter_name=param_key).first()
                if not init_param:
                    u.password_hash = conf['password_hash']
                    db.session.add(SystemParameter(parameter_name=param_key, value='true', description=f"Initial password set for {conf['username']}"))
                db.session.commit()
        except Exception:
            db.session.rollback()


_columns_checked = False

@app.before_request
def ensure_db_columns_exist():
    """Ensure newly added columns exist in the database upon startup/first request"""
    global _columns_checked
    if not _columns_checked:
        try:
            migration_cols = [
                ("flute_type_2", "VARCHAR(20)"),
                ("production_method", "VARCHAR(20) DEFAULT 'In-house'"),
                ("carton_type", "VARCHAR(50) DEFAULT 'RSC'"),
                ("die_length_mm", "FLOAT DEFAULT 0.0"),
                ("die_width_mm", "FLOAT DEFAULT 0.0"),
                ("die_making_cost", "FLOAT DEFAULT 0.0"),
                ("block_making_cost", "FLOAT DEFAULT 0.0"),
                ("one_time_transport_cost", "FLOAT DEFAULT 0.0"),
                ("payment_method", "VARCHAR(100) DEFAULT 'Credit - 30 Days'"),
                ("dimension_unit", "VARCHAR(10) DEFAULT 'mm'"),
                ("carton_length_input", "VARCHAR(50)"),
                ("carton_width_input", "VARCHAR(50)"),
                ("carton_height_input", "VARCHAR(50)"),
                ("die_length_input", "VARCHAR(50)"),
                ("die_width_input", "VARCHAR(50)"),
                ("transport_option", "VARCHAR(100) DEFAULT 'Ex factory price from Biyagama factory ( No transport)'"),
                ("items", "TEXT"),
                ("print_name", "VARCHAR(50)"),
            ]
            is_postgres = db.engine.dialect.name == 'postgresql'
            for col_name, col_type in migration_cols:
                for tbl in ["quote", "quotes"]:
                    try:
                        with db.engine.connect() as conn:
                            if is_postgres:
                                conn.execute(db.text(f"ALTER TABLE {tbl} ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))
                            else:
                                conn.execute(db.text(f"ALTER TABLE {tbl} ADD COLUMN {col_name} {col_type}"))
                            conn.commit()
                    except Exception:
                        pass

            default_params = [
                ('inhouse_waste_percent', '5', 'Inhouse Waste allowance %'),
                ('outsource_waste_percent', '3', 'Outsource Waste allowance %'),
                ('outsource_sf_waste_percent', '1', 'Outsource SF Waste allowance %'),
                ('white_liner_board_rate', '285', 'White Liner Board Rate (Rs./kg)'),
                ('brown_liner_board_rate', '260', 'Brown Liner Board Rate (Rs./kg)'),
                ('joining_cost_glued_s', '3.00', 'Auto Joining Cost - Glued Type S (Rs.)'),
                ('joining_cost_glued_m', '4.50', 'Auto Joining Cost - Glued Type M (Rs.)'),
                ('joining_cost_glued_l', '6.00', 'Auto Joining Cost - Glued Type L (Rs.)'),
            ]
            for p_name, val, desc in default_params:
                try:
                    if not SystemParameter.query.filter_by(parameter_name=p_name).first():
                        db.session.add(SystemParameter(parameter_name=p_name, value=val, description=desc))
                        db.session.commit()
                except Exception:
                    db.session.rollback()

            # Seed / sync required users
            seed_or_update_default_users()

            _columns_checked = True
        except Exception:
            pass

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
    """Login user with case-insensitive username match"""
    try:
        data = request.get_json()
        req_username = (data.get('username') or '').strip()
        user = User.query.filter(db.func.lower(User.username) == req_username.lower()).first()
        req_password = data.get('password', '')
        
        if not user or (not user.check_password(req_password) and not user.check_password(req_password.strip())):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        access_token = create_access_token(identity=str(user.id))
        return jsonify({
            'access_token': access_token,
            'user': {
                'id': user.id, 
                'username': user.username, 
                'is_admin': user.is_admin,
                'can_delete': user.is_admin
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/auth/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Allow logged in user to redefine their password"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json() or {}
        current_password = str(data.get('current_password', '')).strip()
        new_password = str(data.get('new_password', '')).strip()

        if not current_password or not new_password:
            return jsonify({'error': 'Current password and new password are required'}), 400

        if not user.check_password(current_password):
            return jsonify({'error': 'Incorrect current password'}), 400

        if len(new_password) < 4:
            return jsonify({'error': 'New password must be at least 4 characters long'}), 400

        user.set_password(new_password)
        try:
            param_key = f"init_pw_{user.username.lower()}_v1"
            param = SystemParameter.query.filter_by(parameter_name=param_key).first()
            if not param:
                db.session.add(SystemParameter(parameter_name=param_key, value='custom', description=f"Custom password set for {user.username}"))
            else:
                param.value = 'custom'
        except Exception:
            pass
        db.session.commit()

        return jsonify({'message': 'Password redefined successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@app.route('/api/auth/demo-login', methods=['POST'])
def demo_login():
    """One-click guest login for portfolio demo — only active when DEMO_MODE=true."""
    if os.getenv('DEMO_MODE', '').lower() != 'true':
        return jsonify({'error': 'Demo mode is not enabled on this server'}), 403

    try:
        demo_user = User.query.filter_by(username='demo').first()
        if not demo_user:
            return jsonify({'error': 'Demo account not initialised. Contact the developer.'}), 500

        access_token = create_access_token(identity=str(demo_user.id))
        return jsonify({
            'access_token': access_token,
            'user': {
                'id': demo_user.id,
                'username': demo_user.username,
                'is_admin': False
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/quotes/next-number', methods=['GET'])
@jwt_required()
def get_next_quote_number():
    """Get the next sequential quote number for display in enter/new mode"""
    try:
        last_quote = Quote.query.order_by(Quote.id.desc()).first()
        next_id = (last_quote.id + 1) if last_quote else 1
        return jsonify({
            'next_id': next_id,
            'quote_no': f"QT-{str(next_id).zfill(5)}"
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
        
        inhouse_waste_param = SystemParameter.query.filter_by(parameter_name='inhouse_waste_percent').first() or SystemParameter.query.filter_by(parameter_name='waste_allowance_percent').first()
        inhouse_waste_rate = safe_float(inhouse_waste_param.value) if inhouse_waste_param else 5.0
        
        outsource_waste_param = SystemParameter.query.filter_by(parameter_name='outsource_waste_percent').first()
        outsource_waste_rate = safe_float(outsource_waste_param.value) if outsource_waste_param else 3.0

        outsource_sf_waste_param = SystemParameter.query.filter_by(parameter_name='outsource_sf_waste_percent').first()
        outsource_sf_waste_rate = safe_float(outsource_sf_waste_param.value) if outsource_sf_waste_param else 1.0
        
        prod_method = data.get('production_method') or data.get('productionMethod', 'In-house')
        is_outsource = prod_method in ['Outsource', 'Outsource SF']

        white_liner_param = SystemParameter.query.filter_by(parameter_name='white_liner_board_rate').first()
        default_white_liner = safe_float(white_liner_param.value) if white_liner_param else 285.0

        brown_liner_param = SystemParameter.query.filter_by(parameter_name='brown_liner_board_rate').first()
        default_brown_liner = safe_float(brown_liner_param.value) if brown_liner_param else 260.0

        glued_s_param = SystemParameter.query.filter_by(parameter_name='joining_cost_glued_s').first()
        default_glued_s = safe_float(glued_s_param.value) if glued_s_param else 3.00

        glued_m_param = SystemParameter.query.filter_by(parameter_name='joining_cost_glued_m').first()
        default_glued_m = safe_float(glued_m_param.value) if glued_m_param else 4.50

        glued_l_param = SystemParameter.query.filter_by(parameter_name='joining_cost_glued_l').first()
        default_glued_l = safe_float(glued_l_param.value) if glued_l_param else 6.00

        raw_board_type = data.get('board_type') or data.get('boardType') or 'Brown Liner'
        is_white_board = ('white' in raw_board_type.lower())
        board_type = 'White Liner' if is_white_board else 'Brown Liner'
        req_white = safe_float(data.get('white_liner_rate', 0))
        req_brown = safe_float(data.get('brown_liner_rate', 0))
        if is_white_board and req_white <= 0:
            req_white = default_white_liner
        elif not is_white_board and req_brown <= 0:
            req_brown = default_brown_liner

        # Create parameters with corrected logic
        params = CostingParameters(
            carton_length_mm=round(safe_float(data.get('carton_length_mm'))),
            carton_width_mm=round(safe_float(data.get('carton_width_mm'))),
            carton_height_mm=round(safe_float(data.get('carton_height_mm'))),
            quantity=safe_int(data.get('quantity')),
            ply_type=data.get('ply_type'),
            board_type='Whitecut' if is_white_board else 'Browncut',
            flute_type=data.get('flute_type') or data.get('fluteType', 'B-Flute'),
            flute_type_2=data.get('flute_type_2') or data.get('fluteType2') or data.get('flute_type') or data.get('fluteType', 'B-Flute'),
            production_method=prod_method,
            carton_type=data.get('carton_type') or data.get('cartonType', 'RSC'),
            die_length_mm=round(safe_float(data.get('die_length_mm') or data.get('dieLength', 0))),
            die_width_mm=round(safe_float(data.get('die_width_mm') or data.get('dieWidth', 0))),
            inhouse_waste_percent=inhouse_waste_rate,
            outsource_waste_percent=outsource_waste_rate,
            outsource_sf_waste_percent=outsource_sf_waste_rate,
            joining_type=data.get('joining_type'),
            is_printed=data.get('is_printed', False),
            white_liner_rate=req_white,
            brown_liner_rate=req_brown,
            gsm_values=gsm_values,
            total_overhead_for_order=0.0 if is_outsource else safe_float(data.get('total_overhead_for_order', 0)),
            joining_cost=0.0 if (is_outsource or (data.get('carton_type') or data.get('cartonType')) == 'S.F.') else safe_float(data.get('joining_cost', 0)),
            print_cost=0.0 if is_outsource else (safe_float(data.get('print_cost', 0)) if data.get('is_printed') else 0),
            slotting_cost=0.0 if is_outsource else safe_float(data.get('slotting_cost', 0)),
            bundling_cost=0.0 if is_outsource else safe_float(data.get('bundling_cost', 0)),
            diecutting_cost=0.0 if is_outsource else safe_float(data.get('diecutting_cost', 0)),
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
            joining_cost_glued_s=safe_float(data.get('joining_cost_glued_s'), default_glued_s),
            joining_cost_glued_m=safe_float(data.get('joining_cost_glued_m'), default_glued_m),
            joining_cost_glued_l=safe_float(data.get('joining_cost_glued_l'), default_glued_l),
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
    """Save quote to database - supports single item and multi-item quotes"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        # Get or create customer
        customer = Customer.query.filter_by(name=data.get('customerName')).first()
        if not customer:
            customer = Customer(name=data.get('customerName'))
            db.session.add(customer)
            db.session.flush()
        
        raw_items = data.get('items')
        is_multi_item = isinstance(raw_items, list) and len(raw_items) > 0
        first_item = raw_items[0] if is_multi_item else data
        
        # Parse GSM values
        gsm_values = first_item.get('gsm_values', data.get('gsm_values', []))
        if isinstance(gsm_values, str):
            gsm_values = json.loads(gsm_values)
        
        # Determine production method
        production_method = first_item.get('productionMethod') or first_item.get('production_method') or data.get('productionMethod') or data.get('production_method', 'In-house')
        is_outsource = production_method in ['Outsource', 'Outsource SF']

        # Calculate overhead per carton (0 if Outsource)
        total_overhead = 0.0 if is_outsource else safe_float(data.get('totalOverheadForOrder', 0))
        
        if is_multi_item:
            overall_quantity = sum(safe_int(item.get('quantity', 0)) for item in raw_items)
            items_sum = sum(
                safe_float(item.get('total_cost_batch') or item.get('totalCostBatch') or 
                           (safe_float(item.get('final_cost_per_carton') or item.get('finalCostPerCarton', 0)) * safe_int(item.get('quantity', 1))))
                for item in raw_items
            )
            die_cost = safe_float(data.get('oneTimeDieCost') or data.get('die_making_cost') or 0)
            block_cost = safe_float(data.get('oneTimeBlockCost') or data.get('block_making_cost') or 0)
            one_time_trans = safe_float(data.get('oneTimeTransportCost') or data.get('one_time_transport_cost') or 0)
            overall_batch_cost = items_sum + die_cost + block_cost + one_time_trans
        else:
            overall_quantity = safe_int(data.get('quantity', 1))
            overall_batch_cost = None

        overhead_per_carton = total_overhead / overall_quantity if overall_quantity > 0 else 0
        print_name = str(first_item.get('print_name') or first_item.get('printName') or data.get('print_name') or data.get('printName') or '')[:50]

        target_quote_id = data.get('quote_id') or data.get('id')
        quote = None
        if target_quote_id:
            try:
                quote = Quote.query.get(int(target_quote_id))
            except Exception:
                quote = None

        is_new = quote is None
        if is_new:
            quote = Quote(user_id=user_id)
            db.session.add(quote)
        else:
            quote.user_id = user_id

        quote.customer_id = customer.id
        quote.customer_name = data.get('customerName')
        quote.carton_length_mm = round(safe_float(first_item.get('cartonLength') or first_item.get('carton_length_mm', 0)))
        quote.carton_width_mm = round(safe_float(first_item.get('cartonWidth') or first_item.get('carton_width_mm', 0)))
        quote.carton_height_mm = round(safe_float(first_item.get('cartonHeight') or first_item.get('carton_height_mm', 0)))
        quote.dimension_unit = first_item.get('dimension_unit') or first_item.get('dimensionUnit') or data.get('dimension_unit') or data.get('dimensionUnit') or 'mm'
        quote.carton_length_input = str(first_item.get('carton_length_input') or first_item.get('cartonLengthInput') or '')
        quote.carton_width_input = str(first_item.get('carton_width_input') or first_item.get('cartonWidthInput') or '')
        quote.carton_height_input = str(first_item.get('carton_height_input') or first_item.get('cartonHeightInput') or '')
        quote.die_length_input = str(first_item.get('die_length_input') or first_item.get('dieLengthInput') or '')
        quote.die_width_input = str(first_item.get('die_width_input') or first_item.get('dieWidthInput') or '')
        quote.quantity = overall_quantity
        quote.ply_type = first_item.get('plyType') or first_item.get('ply_type', '3-Ply')
        quote.board_type = 'White Liner' if 'white' in str(first_item.get('boardType') or first_item.get('board_type') or '').lower() else 'Brown Liner'
        quote.flute_type = first_item.get('fluteType') or first_item.get('flute_type', 'B-Flute')
        quote.flute_type_2 = first_item.get('fluteType2') or first_item.get('flute_type_2') or first_item.get('fluteType') or first_item.get('flute_type', 'B-Flute')
        quote.production_method = production_method
        quote.carton_type = first_item.get('cartonType') or first_item.get('carton_type', 'RSC')
        quote.die_length_mm = round(safe_float(first_item.get('dieLength') or first_item.get('die_length_mm', 0)))
        quote.die_width_mm = round(safe_float(first_item.get('dieWidth') or first_item.get('die_width_mm', 0)))
        quote.joining_type = first_item.get('joiningType') or first_item.get('joining_type', 'Glued')
        quote.is_printed = bool(first_item.get('isPrinted') or first_item.get('is_printed', False))
        quote.print_name = print_name
        quote.gsm_values = json.dumps(gsm_values)
        quote.white_liner_rate = safe_float(first_item.get('whiteLinerRate', data.get('whiteLinerRate', 0)))
        quote.brown_liner_rate = safe_float(first_item.get('brownLinerRate', data.get('brownLinerRate', 0)))
        quote.total_overhead_for_order = total_overhead
        quote.overhead_per_carton = overhead_per_carton
        quote.joining_cost = 0.0 if (is_outsource or (first_item.get('cartonType') or first_item.get('carton_type')) == 'S.F.') else safe_float(first_item.get('joiningCost', data.get('joiningCost', 0)))
        quote.print_cost = 0.0 if is_outsource else safe_float(first_item.get('printCost', data.get('printCost', 0)))
        quote.slotting_cost = 0.0 if is_outsource else safe_float(first_item.get('slottingCost', data.get('slottingCost', 0)))
        quote.bundling_cost = 0.0 if is_outsource else safe_float(first_item.get('bundlingCost', data.get('bundlingCost', 0)))
        quote.diecutting_cost = 0.0 if is_outsource else safe_float(first_item.get('diecuttingCost', data.get('diecuttingCost', 0)))
        quote.profit_margin_percent = safe_float(data.get('profitMargin', 15))
        quote.tax_type = data.get('taxType', 'Non-VAT')
        quote.delivery_required = data.get('deliveryRequired', False)
        quote.delivery_location = data.get('deliveryLocation')
        quote.distance_km = safe_float(data.get('distanceKm', 0))
        quote.has_inhouse_commission = data.get('hasInhouseCommission', False)
        quote.has_third_party_commission = data.get('hasThirdPartyCommission', False)
        quote.third_party_commission = safe_float(data.get('thirdPartyCommission', 0))
        quote.has_transport = data.get('hasTransport', False)
        quote.transport_cost = safe_float(data.get('transportCost', 0))
        quote.transport_option = data.get('transportOption') or data.get('transport_option') or ('Including transport' if data.get('hasTransport') else 'Ex factory price from Biyagama factory ( No transport)')
        quote.die_making_cost = safe_float(data.get('oneTimeDieCost') or data.get('die_making_cost') or 0)
        quote.block_making_cost = safe_float(data.get('oneTimeBlockCost') or data.get('block_making_cost') or 0)
        quote.one_time_transport_cost = safe_float(data.get('oneTimeTransportCost') or data.get('one_time_transport_cost') or 0)
        quote.payment_method = data.get('paymentMethod') or data.get('payment_method') or "Credit - 30 Days"
        quote.items = json.dumps(raw_items) if is_multi_item else json.dumps([
            dict(data, 
                 final_cost_per_carton=(data.get('calculated_cost', {}).get('final', {}).get('final_cost_per_carton') or data.get('final_cost_per_carton')),
                 total_cost_batch=(data.get('calculated_cost', {}).get('final', {}).get('total_cost_batch') or data.get('total_cost_batch')),
                 quantity=overall_quantity)
        ])
        
        # Add calculated costs
        if is_multi_item:
            quote.total_cost_batch = overall_batch_cost
            if 'calculated_cost' in first_item:
                calc = first_item['calculated_cost']
                quote.final_cost_per_carton = calc.get('final', {}).get('final_cost_per_carton')
                quote.subtotal_per_carton = calc.get('per_carton_costs', {}).get('subtotal')
        elif 'calculated_cost' in data:
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
        
        db.session.commit()
        
        quote_no = f"QT-{str(quote.id).zfill(5)}"
        msg = f"Quote {quote_no} updated successfully" if not is_new else "Quote saved successfully"
        status_code = 200 if not is_new else 201
        return jsonify({'id': quote.id, 'quote_no': quote_no, 'message': msg, 'is_update': not is_new}), status_code
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@app.route('/api/quotes/history', methods=['GET'])
@jwt_required()
def get_quote_history():
    """Get all company quote history (accessible to all authenticated users)"""
    try:
        quotes = Quote.query.order_by(Quote.created_at.desc()).all()
        user_map = {}
        try:
            for u in User.query.all():
                user_map[u.id] = u.username
        except Exception:
            pass
        
        result = []
        for quote in quotes:
            dim_unit = getattr(quote, 'dimension_unit', 'mm') or 'mm'
            carton_type = getattr(quote, 'carton_type', 'RSC') or 'RSC'
            is_sf = carton_type == 'S.F.'
            l_in = getattr(quote, 'carton_length_input', None)
            w_in = getattr(quote, 'carton_width_input', None)
            h_in = getattr(quote, 'carton_height_input', None)
            die_l_in = getattr(quote, 'die_length_input', None)
            die_w_in = getattr(quote, 'die_width_input', None)
            c_l = round(quote.carton_length_mm) if quote.carton_length_mm else 0
            c_w = round(quote.carton_width_mm) if quote.carton_width_mm else 0
            c_h = round(quote.carton_height_mm) if quote.carton_height_mm else 0
            die_l = round(quote.die_length_mm) if getattr(quote, 'die_length_mm', None) else 0
            die_w = round(quote.die_width_mm) if getattr(quote, 'die_width_mm', None) else 0
            ply_type = quote.ply_type or '3-Ply'
            ply_clean = ply_type.replace('-', ' ')
            is_printed = bool(quote.is_printed)

            if is_sf:
                if dim_unit == 'inches':
                    if die_l_in and die_w_in:
                        dim_display = f"{die_l_in}×{die_w_in} inches"
                    elif die_l > 0 and die_w > 0:
                        dim_display = f"{(die_l / 25.4):.2f}".rstrip('0').rstrip('.') + f"×{(die_w / 25.4):.2f}".rstrip('0').rstrip('.') + " inches"
                    else:
                        dim_display = f"{die_l}×{die_w} mm"
                else:
                    dim_display = f"{die_l}×{die_w} mm"
                is_sheet = ply_type in ['2-Ply', '4-Ply']
                product_noun = ('Printed Sheet' if is_printed else 'Sheet') if is_sheet else ('Printed Boards' if is_printed else 'Boards')
                main_desc = f"{dim_display} - {ply_clean} {product_noun} - S.F."
            else:
                if dim_unit == 'inches' and l_in and w_in and h_in:
                    dim_display = f"{l_in}×{w_in}×{h_in} inches"
                elif dim_unit == 'inches' and (c_l > 0 or c_w > 0 or c_h > 0):
                    dim_display = f"{(c_l / 25.4):.2f}".rstrip('0').rstrip('.') + f"×{(c_w / 25.4):.2f}".rstrip('0').rstrip('.') + f"×{(c_h / 25.4):.2f}".rstrip('0').rstrip('.') + " inches"
                else:
                    dim_display = f"{c_l}×{c_w}×{c_h} mm"
                product_noun = 'Printed Carton' if is_printed else 'Carton'
                type_str = carton_type if 'type' in carton_type.lower() else f"{carton_type} Type"
                main_desc = f"{dim_display} - {ply_clean} {product_noun} - {type_str}"

            items_list = []
            if getattr(quote, 'items', None):
                try:
                    items_list = json.loads(quote.items) if isinstance(quote.items, str) else quote.items
                    if isinstance(items_list, list):
                        for it in items_list:
                            if isinstance(it, dict):
                                if not it.get('final_cost_per_carton') and not it.get('finalCostPerCarton'):
                                    calc = it.get('calculated_cost', {})
                                    if isinstance(calc, dict):
                                        it['final_cost_per_carton'] = calc.get('final', {}).get('final_cost_per_carton') or quote.final_cost_per_carton
                                        it['total_cost_batch'] = calc.get('final', {}).get('total_cost_batch') or quote.total_cost_batch
                                    else:
                                        it['final_cost_per_carton'] = quote.final_cost_per_carton
                                        it['total_cost_batch'] = quote.total_cost_batch
                                if not it.get('quantity'):
                                    it['quantity'] = quote.quantity
                except Exception:
                    items_list = []

            orig_name = user_map.get(quote.user_id, 'Admin')
            result.append({
                'id': quote.id,
                'quote_no': f"QT-{str(quote.id).zfill(5)}",
                'customer_name': quote.customer_name,
                'originator_name': orig_name,
                'prepared_by': orig_name,
                'created_by': orig_name,
                'dimensions': dim_display,
                'description': main_desc,
                'item_description': main_desc,
                'dimension_unit': dim_unit,
                'carton_length_input': l_in,
                'carton_width_input': w_in,
                'carton_height_input': h_in,
                'die_length_input': getattr(quote, 'die_length_input', None),
                'die_width_input': getattr(quote, 'die_width_input', None),
                'carton_length_mm': c_l,
                'carton_width_mm': c_w,
                'carton_height_mm': c_h,
                'ply_type': quote.ply_type,
                'carton_type': getattr(quote, 'carton_type', 'RSC') or 'RSC',
                'die_length_mm': round(getattr(quote, 'die_length_mm', 0.0) or 0.0),
                'die_width_mm': round(getattr(quote, 'die_width_mm', 0.0) or 0.0),
                'board_type': quote.board_type,
                'flute_type': quote.flute_type,
                'flute_type_2': getattr(quote, 'flute_type_2', None) or quote.flute_type,
                'die_making_cost': getattr(quote, 'die_making_cost', 0.0) or 0.0,
                'block_making_cost': getattr(quote, 'block_making_cost', 0.0) or 0.0,
                'one_time_transport_cost': getattr(quote, 'one_time_transport_cost', 0.0) or 0.0,
                'payment_method': getattr(quote, 'payment_method', 'Credit - 30 Days') or 'Credit - 30 Days',
                'quantity': quote.quantity,
                'is_printed': bool(quote.is_printed),
                'print_name': getattr(quote, 'print_name', None) or '',
                'joining_type': quote.joining_type,
                'joining_cost': quote.joining_cost,
                'print_cost': quote.print_cost,
                'slotting_cost': quote.slotting_cost,
                'bundling_cost': quote.bundling_cost,
                'diecutting_cost': quote.diecutting_cost,
                'total_overhead_for_order': quote.total_overhead_for_order,
                'overhead_per_carton': quote.overhead_per_carton,
                'white_liner_rate': quote.white_liner_rate,
                'brown_liner_rate': quote.brown_liner_rate,
                'gsm_values': json.loads(quote.gsm_values) if quote.gsm_values else [],
                'has_transport': bool(quote.has_transport),
                'transport_cost': quote.transport_cost,
                'transport_option': getattr(quote, 'transport_option', None) or ('Including transport' if quote.has_transport else 'Ex factory price from Biyagama factory ( No transport)'),
                'has_inhouse_commission': quote.has_inhouse_commission,
                'has_third_party_commission': quote.has_third_party_commission,
                'third_party_commission': quote.third_party_commission,
                'profit_margin_percent': quote.profit_margin_percent,
                'tax_type': quote.tax_type,
                'final_cost_per_carton': quote.final_cost_per_carton,
                'total_cost_batch': quote.total_cost_batch,
                'items': items_list,
                'item_count': len(items_list) if items_list else 1,
                'created_at': quote.created_at.isoformat() + 'Z'
            })
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/quotes/<int:quote_id>', methods=['GET'])
@jwt_required()
def get_quote(quote_id):
    """Get specific quote (accessible to all authenticated users)"""
    try:
        quote = Quote.query.filter_by(id=quote_id).first()
        
        if not quote:
            return jsonify({'error': 'Quote not found'}), 404
        
        items_list = []
        if getattr(quote, 'items', None):
            try:
                items_list = json.loads(quote.items) if isinstance(quote.items, str) else quote.items
                if isinstance(items_list, list):
                    for it in items_list:
                        if isinstance(it, dict):
                            if not it.get('final_cost_per_carton') and not it.get('finalCostPerCarton'):
                                calc = it.get('calculated_cost', {})
                                if isinstance(calc, dict):
                                    it['final_cost_per_carton'] = calc.get('final', {}).get('final_cost_per_carton') or quote.final_cost_per_carton
                                    it['total_cost_batch'] = calc.get('final', {}).get('total_cost_batch') or quote.total_cost_batch
                                else:
                                    it['final_cost_per_carton'] = quote.final_cost_per_carton
                                    it['total_cost_batch'] = quote.total_cost_batch
                            if not it.get('quantity'):
                                it['quantity'] = quote.quantity
            except Exception:
                items_list = []

        quote_user = None
        try:
            if quote.user_id:
                quote_user = User.query.get(quote.user_id)
        except Exception:
            pass
        originator_name = quote_user.username if quote_user else 'Admin'

        carton_type = getattr(quote, 'carton_type', 'RSC') or 'RSC'
        is_sf = carton_type == 'S.F.'
        dim_unit = getattr(quote, 'dimension_unit', 'mm') or 'mm'
        l_in = getattr(quote, 'carton_length_input', None)
        w_in = getattr(quote, 'carton_width_input', None)
        h_in = getattr(quote, 'carton_height_input', None)
        die_l_in = getattr(quote, 'die_length_input', None)
        die_w_in = getattr(quote, 'die_width_input', None)
        c_l = round(quote.carton_length_mm) if quote.carton_length_mm else 0
        c_w = round(quote.carton_width_mm) if quote.carton_width_mm else 0
        c_h = round(quote.carton_height_mm) if quote.carton_height_mm else 0
        die_l = round(quote.die_length_mm) if getattr(quote, 'die_length_mm', None) else 0
        die_w = round(quote.die_width_mm) if getattr(quote, 'die_width_mm', None) else 0
        ply_type = quote.ply_type or '3-Ply'
        ply_clean = ply_type.replace('-', ' ')
        is_printed = bool(quote.is_printed)

        if is_sf:
            if dim_unit == 'inches':
                if die_l_in and die_w_in:
                    dim_display = f"{die_l_in}×{die_w_in} inches"
                elif die_l > 0 and die_w > 0:
                    dim_display = f"{(die_l / 25.4):.2f}".rstrip('0').rstrip('.') + f"×{(die_w / 25.4):.2f}".rstrip('0').rstrip('.') + " inches"
                else:
                    dim_display = f"{die_l}×{die_w} mm"
            else:
                dim_display = f"{die_l}×{die_w} mm"
            is_sheet = ply_type in ['2-Ply', '4-Ply']
            product_noun = ('Printed Sheet' if is_printed else 'Sheet') if is_sheet else ('Printed Boards' if is_printed else 'Boards')
            main_desc = f"{dim_display} - {ply_clean} {product_noun} - S.F."
        else:
            if dim_unit == 'inches' and l_in and w_in and h_in:
                dim_display = f"{l_in}×{w_in}×{h_in} inches"
            elif dim_unit == 'inches' and (c_l > 0 or c_w > 0 or c_h > 0):
                dim_display = f"{(c_l / 25.4):.2f}".rstrip('0').rstrip('.') + f"×{(c_w / 25.4):.2f}".rstrip('0').rstrip('.') + f"×{(c_h / 25.4):.2f}".rstrip('0').rstrip('.') + " inches"
            else:
                dim_display = f"{c_l}×{c_w}×{c_h} mm"
            product_noun = 'Printed Carton' if is_printed else 'Carton'
            type_str = carton_type if 'type' in carton_type.lower() else f"{carton_type} Type"
            main_desc = f"{dim_display} - {ply_clean} {product_noun} - {type_str}"

        return jsonify({
            'id': quote.id,
            'quote_no': f"QT-{str(quote.id).zfill(5)}",
            'customer_name': quote.customer_name,
            'originator_name': originator_name,
            'prepared_by': originator_name,
            'created_by': originator_name,
            'description': main_desc,
            'item_description': main_desc,
            'dimensions_display': dim_display,
            'created_at': quote.created_at.strftime('%d/%m/%Y') if quote.created_at else datetime.utcnow().strftime('%d/%m/%Y'),
            'dimension_unit': getattr(quote, 'dimension_unit', 'mm') or 'mm',
            'carton_length_input': getattr(quote, 'carton_length_input', None),
            'carton_width_input': getattr(quote, 'carton_width_input', None),
            'carton_height_input': getattr(quote, 'carton_height_input', None),
            'die_length_input': getattr(quote, 'die_length_input', None),
            'die_width_input': getattr(quote, 'die_width_input', None),
            'carton_length_mm': round(quote.carton_length_mm) if quote.carton_length_mm else 0,
            'carton_width_mm': round(quote.carton_width_mm) if quote.carton_width_mm else 0,
            'carton_height_mm': round(quote.carton_height_mm) if quote.carton_height_mm else 0,
            'quantity': quote.quantity,
            'ply_type': quote.ply_type,
            'board_type': quote.board_type,
            'flute_type': quote.flute_type,
            'flute_type_2': getattr(quote, 'flute_type_2', None) or quote.flute_type,
            'production_method': getattr(quote, 'production_method', 'In-house') or 'In-house',
            'carton_type': getattr(quote, 'carton_type', 'RSC') or 'RSC',
            'die_length_mm': round(getattr(quote, 'die_length_mm', 0.0) or 0.0),
            'die_width_mm': round(getattr(quote, 'die_width_mm', 0.0) or 0.0),
            'joining_type': quote.joining_type,
            'is_printed': quote.is_printed,
            'print_name': getattr(quote, 'print_name', None) or '',
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
            'transport_option': getattr(quote, 'transport_option', None) or ('Including transport' if quote.has_transport else 'Ex factory price from Biyagama factory ( No transport)'),
            'die_making_cost': getattr(quote, 'die_making_cost', 0.0) or 0.0,
            'block_making_cost': getattr(quote, 'block_making_cost', 0.0) or 0.0,
            'one_time_transport_cost': getattr(quote, 'one_time_transport_cost', 0.0) or 0.0,
            'payment_method': getattr(quote, 'payment_method', 'Credit - 30 Days') or 'Credit - 30 Days',
            'rm_cost_per_carton': quote.rm_cost_per_carton,
            'profit_per_carton': quote.profit_per_carton,
            'tax_amount_per_carton': quote.tax_amount_per_carton,
            'subtotal_per_carton': quote.subtotal_per_carton,
            'dimensions': {
                'length_mm': round(quote.carton_length_mm) if quote.carton_length_mm else 0,
                'width_mm': round(quote.carton_width_mm) if quote.carton_width_mm else 0,
                'height_mm': round(quote.carton_height_mm) if quote.carton_height_mm else 0
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
            'total_cost_batch': quote.total_cost_batch,
            'items': items_list,
            'item_count': len(items_list) if items_list else 1
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/quotes/<int:quote_id>', methods=['DELETE'])
@jwt_required()
def delete_quote(quote_id):
    """Delete a specific quote by ID - requires Admin authority"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or not user.is_admin:
            return jsonify({'error': 'You do not have deleting authority. Only Admin can delete quotations.'}), 403

        quote = Quote.query.filter_by(id=quote_id).first()
        if not quote:
            return jsonify({'error': 'Quote not found'}), 404

        quote_no = f"QT-{str(quote.id).zfill(5)}"
        db.session.delete(quote)
        db.session.commit()
        return jsonify({'message': f'Quote {quote_no} deleted successfully', 'id': quote_id}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@app.route('/api/quotes/bulk-delete', methods=['POST'])
@jwt_required()
def bulk_delete_quotes():
    """Bulk delete quotations by IDs - requires Admin authority"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or not user.is_admin:
            return jsonify({'error': 'You do not have deleting authority. Only Admin can delete quotations.'}), 403

        data = request.get_json() or {}
        quote_ids = data.get('quote_ids', [])
        if not quote_ids or not isinstance(quote_ids, list):
            return jsonify({'error': 'No quote IDs provided'}), 400

        deleted_count = 0
        for qid in quote_ids:
            try:
                quote = Quote.query.get(int(qid))
                if quote:
                    db.session.delete(quote)
                    deleted_count += 1
            except Exception:
                continue

        db.session.commit()
        return jsonify({
            'message': f'Successfully deleted {deleted_count} quotation(s)',
            'deleted_count': deleted_count
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@app.route('/api/customers', methods=['GET'])
@jwt_required()
def get_customers():
    """Get list of distinct customer names"""
    try:
        customers = Customer.query.order_by(Customer.name.asc()).all()
        names = [c.name for c in customers if c.name and c.name.strip()]
        return jsonify(names), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/quotes/<int:quote_id>/update-customer-name', methods=['PUT', 'POST'])
@jwt_required()
def update_quote_customer_name(quote_id):
    """Update only customer name for an existing quotation - Admin only"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or not user.is_admin:
            return jsonify({'error': 'Only Admin has authority to edit customer name on existing quotations.'}), 403

        quote = Quote.query.get(quote_id)
        if not quote:
            return jsonify({'error': 'Quote not found'}), 404

        data = request.get_json() or {}
        new_name = (data.get('customer_name') or data.get('customerName') or '').strip()
        if not new_name:
            return jsonify({'error': 'Customer name cannot be empty'}), 400

        customer = Customer.query.filter_by(name=new_name).first()
        if not customer:
            customer = Customer(name=new_name)
            db.session.add(customer)
            db.session.flush()

        quote.customer_name = new_name
        quote.customer_id = customer.id

        if quote.items:
            try:
                items_data = json.loads(quote.items) if isinstance(quote.items, str) else quote.items
                if isinstance(items_data, list):
                    for it in items_data:
                        if isinstance(it, dict):
                            it['customerName'] = new_name
                            it['customer_name'] = new_name
                    quote.items = json.dumps(items_data)
            except Exception:
                pass

        db.session.commit()
        quote_no = f"QT-{str(quote.id).zfill(5)}"
        return jsonify({
            'message': f'Customer name for {quote_no} updated successfully to "{new_name}"',
            'quote_no': quote_no,
            'customer_name': new_name
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@app.route('/api/quotes/bulk-update-customer-name', methods=['POST'])
@jwt_required()
def bulk_update_customer_name():
    """Bulk update customer name for multiple quotations to make them uniform - Admin only"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or not user.is_admin:
            return jsonify({'error': 'Only Admin has authority to edit customer name on existing quotations.'}), 403

        data = request.get_json() or {}
        quote_ids = data.get('quote_ids', [])
        new_name = (data.get('customer_name') or data.get('customerName') or '').strip()

        if not quote_ids or not isinstance(quote_ids, list):
            return jsonify({'error': 'No quote IDs provided'}), 400
        if not new_name:
            return jsonify({'error': 'Customer name cannot be empty'}), 400

        customer = Customer.query.filter_by(name=new_name).first()
        if not customer:
            customer = Customer(name=new_name)
            db.session.add(customer)
            db.session.flush()

        updated_count = 0
        for qid in quote_ids:
            try:
                quote = Quote.query.get(int(qid))
                if quote:
                    quote.customer_name = new_name
                    quote.customer_id = customer.id
                    if quote.items:
                        try:
                            items_data = json.loads(quote.items) if isinstance(quote.items, str) else quote.items
                            if isinstance(items_data, list):
                                for it in items_data:
                                    if isinstance(it, dict):
                                        it['customerName'] = new_name
                                        it['customer_name'] = new_name
                                quote.items = json.dumps(items_data)
                        except Exception:
                            pass
                    updated_count += 1
            except Exception:
                continue

        db.session.commit()
        return jsonify({
            'message': f'Successfully updated customer name to "{new_name}" on {updated_count} quotation(s)',
            'updated_count': updated_count,
            'customer_name': new_name
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@app.route('/api/health', methods=['GET'])
def health():
    """Lightweight ping endpoint for uptime monitors to prevent Render cold starts"""
    return jsonify({'status': 'ok', 'service': 'carton-costing-api'}), 200


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


def seed_demo_data():
    """Seed the database with fake demo data. Only runs when DEMO_MODE=true."""
    from datetime import date

    # Create demo user
    if not User.query.filter_by(username='demo').first():
        demo = User(username='demo', email='demo@example.com', is_admin=False)
        demo.set_password('demo-not-used')  # password not used — demo-login bypasses it
        db.session.add(demo)
        db.session.flush()

    demo_user = User.query.filter_by(username='demo').first()

    # Only seed quotes if none exist for the demo user
    if Quote.query.filter_by(user_id=demo_user.id).count() > 0:
        db.session.commit()
        return

    # Fake customers
    fake_customers = [
        Customer(name='Packaging Co. (Demo)', email='info@packagingco-demo.lk', phone='011-2345678', location='Colombo'),
        Customer(name='FreshBox Exports (Demo)', email='orders@freshbox-demo.lk', phone='011-9876543', location='Gampaha'),
        Customer(name='Ceylon Corrugated (Demo)', email='sales@ceylon-demo.lk', phone='038-2234567', location='Kalutara'),
    ]
    for c in fake_customers:
        db.session.add(c)
    db.session.flush()

    # Realistic fake quotes
    demo_quotes_data = [
        dict(
            customer_name='Packaging Co. (Demo)',
            carton_length_mm=400, carton_width_mm=300, carton_height_mm=250,
            quantity=5000, ply_type='3-Ply', board_type='Whitecut', flute_type='B-Flute',
            joining_type='Glued', is_printed=True,
            sheet_length_mm=1050, sheet_width_mm=640, board_area_m2=0.672,
            selected_reel_mm=650, sheets_per_reel=8, reel_waste_mm=10,
            total_gsm=420, weight_per_sheet_kg=0.282,
            white_liner_rate=185.0, brown_liner_rate=165.0,
            rm_cost_per_carton=52.40, overhead_per_carton=4.80,
            total_overhead_for_order=24000, joining_cost=3.50, print_cost=8.00,
            slotting_cost=1.20, bundling_cost=0.80, diecutting_cost=0,
            subtotal_per_carton=70.70, profit_margin_percent=15.0,
            profit_per_carton=10.61, cost_with_profit_per_carton=81.31,
            delivery_required=True, delivery_location='Colombo', distance_km=25,
            transport_per_carton=0.50, has_inhouse_commission=True,
            has_third_party_commission=False, third_party_commission=0,
            has_transport=True, transport_cost=2500,
            tax_type='VAT', tax_amount_per_carton=14.74,
            final_cost_per_carton=96.55, total_cost_batch=482750.00,
            quote_date=date(2026, 7, 12),
        ),
        dict(
            customer_name='FreshBox Exports (Demo)',
            carton_length_mm=500, carton_width_mm=350, carton_height_mm=300,
            quantity=2000, ply_type='5-Ply', board_type='Kraftcut', flute_type='BC-Flute',
            joining_type='Stitched', is_printed=False,
            sheet_length_mm=1300, sheet_width_mm=800, board_area_m2=1.040,
            selected_reel_mm=810, sheets_per_reel=6, reel_waste_mm=10,
            total_gsm=680, weight_per_sheet_kg=0.707,
            white_liner_rate=185.0, brown_liner_rate=165.0,
            rm_cost_per_carton=116.60, overhead_per_carton=6.00,
            total_overhead_for_order=12000, joining_cost=5.50, print_cost=0,
            slotting_cost=1.20, bundling_cost=0.80, diecutting_cost=0,
            subtotal_per_carton=130.10, profit_margin_percent=15.0,
            profit_per_carton=19.52, cost_with_profit_per_carton=149.62,
            delivery_required=False, delivery_location='', distance_km=0,
            transport_per_carton=0, has_inhouse_commission=False,
            has_third_party_commission=True, third_party_commission=7.48,
            has_transport=False, transport_cost=0,
            tax_type='Non-VAT, Inhouse', tax_amount_per_carton=27.05,
            final_cost_per_carton=184.15, total_cost_batch=368300.00,
            quote_date=date(2026, 7, 28),
        ),
        dict(
            customer_name='Ceylon Corrugated (Demo)',
            carton_length_mm=250, carton_width_mm=200, carton_height_mm=150,
            quantity=10000, ply_type='3-Ply', board_type='Kraftcut', flute_type='E-Flute',
            joining_type='Glued', is_printed=True,
            sheet_length_mm=700, sheet_width_mm=440, board_area_m2=0.308,
            selected_reel_mm=450, sheets_per_reel=12, reel_waste_mm=10,
            total_gsm=380, weight_per_sheet_kg=0.117,
            white_liner_rate=185.0, brown_liner_rate=165.0,
            rm_cost_per_carton=19.30, overhead_per_carton=3.20,
            total_overhead_for_order=32000, joining_cost=2.80, print_cost=6.00,
            slotting_cost=0.90, bundling_cost=0.60, diecutting_cost=0,
            subtotal_per_carton=32.80, profit_margin_percent=15.0,
            profit_per_carton=4.92, cost_with_profit_per_carton=37.72,
            delivery_required=True, delivery_location='Kalutara', distance_km=45,
            transport_per_carton=0.40, has_inhouse_commission=False,
            has_third_party_commission=False, third_party_commission=0,
            has_transport=True, transport_cost=4000,
            tax_type='VAT', tax_amount_per_carton=6.86,
            final_cost_per_carton=44.98, total_cost_batch=449800.00,
            quote_date=date(2026, 8, 5),
        ),
        dict(
            customer_name='Packaging Co. (Demo)',
            carton_length_mm=600, carton_width_mm=400, carton_height_mm=350,
            quantity=3000, ply_type='5-Ply', board_type='Whitecut', flute_type='B-Flute',
            joining_type='Glued', is_printed=True,
            sheet_length_mm=1550, sheet_width_mm=950, board_area_m2=1.473,
            selected_reel_mm=960, sheets_per_reel=5, reel_waste_mm=10,
            total_gsm=560, weight_per_sheet_kg=0.825,
            white_liner_rate=185.0, brown_liner_rate=165.0,
            rm_cost_per_carton=152.60, overhead_per_carton=7.20,
            total_overhead_for_order=21600, joining_cost=6.00, print_cost=10.00,
            slotting_cost=1.50, bundling_cost=1.00, diecutting_cost=0,
            subtotal_per_carton=178.30, profit_margin_percent=15.0,
            profit_per_carton=26.75, cost_with_profit_per_carton=205.05,
            delivery_required=False, delivery_location='', distance_km=0,
            transport_per_carton=0, has_inhouse_commission=True,
            has_third_party_commission=False, third_party_commission=0,
            has_transport=False, transport_cost=0,
            tax_type='VAT', tax_amount_per_carton=36.91,
            final_cost_per_carton=241.96, total_cost_batch=725880.00,
            quote_date=date(2026, 8, 19),
        ),
        dict(
            customer_name='FreshBox Exports (Demo)',
            carton_length_mm=320, carton_width_mm=220, carton_height_mm=180,
            quantity=7500, ply_type='3-Ply', board_type='Whitecut', flute_type='C-Flute',
            joining_type='Glued', is_printed=False,
            sheet_length_mm=840, sheet_width_mm=520, board_area_m2=0.437,
            selected_reel_mm=530, sheets_per_reel=10, reel_waste_mm=10,
            total_gsm=390, weight_per_sheet_kg=0.170,
            white_liner_rate=185.0, brown_liner_rate=165.0,
            rm_cost_per_carton=28.10, overhead_per_carton=3.80,
            total_overhead_for_order=28500, joining_cost=3.00, print_cost=0,
            slotting_cost=0.90, bundling_cost=0.60, diecutting_cost=0,
            subtotal_per_carton=36.40, profit_margin_percent=15.0,
            profit_per_carton=5.46, cost_with_profit_per_carton=41.86,
            delivery_required=True, delivery_location='Gampaha', distance_km=30,
            transport_per_carton=0.30, has_inhouse_commission=False,
            has_third_party_commission=False, third_party_commission=0,
            has_transport=True, transport_cost=2250,
            tax_type='Non-VAT, Inhouse', tax_amount_per_carton=7.59,
            final_cost_per_carton=49.75, total_cost_batch=373125.00,
            quote_date=date(2026, 9, 2),
        ),
    ]

    for q_data in demo_quotes_data:
        q = Quote(user_id=demo_user.id, **q_data)
        db.session.add(q)

    db.session.commit()
    print(f"[DEMO] Seeded {len(demo_quotes_data)} fake quotes for demo user.")


def init_db():
    """Initialize database"""
    with app.app_context():
        db.create_all()
        
        # Ensure newly added columns exist in quote table
        for col_name, col_type in [
            ("flute_type_2", "VARCHAR(20)"),
            ("production_method", "VARCHAR(20) DEFAULT 'In-house'"),
            ("carton_type", "VARCHAR(50) DEFAULT 'RSC'"),
            ("die_length_mm", "FLOAT DEFAULT 0.0"),
            ("die_width_mm", "FLOAT DEFAULT 0.0"),
            ("die_making_cost", "FLOAT DEFAULT 0.0"),
            ("block_making_cost", "FLOAT DEFAULT 0.0"),
            ("one_time_transport_cost", "FLOAT DEFAULT 0.0"),
            ("payment_method", "VARCHAR(100) DEFAULT 'Credit - 30 Days'"),
            ("transport_option", "VARCHAR(100) DEFAULT 'Ex factory price from Biyagama factory ( No transport)'"),
        ]:
            for tbl in ["quote", "quotes"]:
                try:
                    with db.engine.connect() as conn:
                        conn.execute(db.text(f"ALTER TABLE {tbl} ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                except Exception:
                    pass  # Column already exists or table doesn't match
        
        # Seed required users: Admin, Manoj, Kaushalya
        seed_or_update_default_users()
        
        # Create default parameters
        default_params = [
            ('profit_margin_percent', '15', 'Default profit margin %'),
            ('vat_rate', '18', 'VAT rate %'),
            ('sscl_rate', '2.125', 'SSCL rate %'),
            ('input_tax_rate', '18', 'Input tax rate % for Non-VAT customers'),
            ('transport_rate_per_km', '10', 'Transport cost per km'),
            ('waste_allowance_percent', '5', 'Inhouse Waste allowance %'),
            ('inhouse_waste_percent', '5', 'Inhouse Waste allowance %'),
            ('outsource_waste_percent', '3', 'Outsource Waste allowance %'),
            ('outsource_sf_waste_percent', '1', 'Outsource SF Waste allowance %'),
            ('white_liner_board_rate', '285', 'White Liner Board Rate (Rs./kg)'),
            ('brown_liner_board_rate', '260', 'Brown Liner Board Rate (Rs./kg)'),
            ('joining_cost_glued_s', '3.00', 'Auto Joining Cost - Glued Type S (Rs.)'),
            ('joining_cost_glued_m', '4.50', 'Auto Joining Cost - Glued Type M (Rs.)'),
            ('joining_cost_glued_l', '6.00', 'Auto Joining Cost - Glued Type L (Rs.)'),
        ]
        
        for param_name, value, description in default_params:
            if not SystemParameter.query.filter_by(parameter_name=param_name).first():
                param = SystemParameter(parameter_name=param_name, value=value, description=description)
                db.session.add(param)
        
        db.session.commit()

        # Seed fake demo data when running in demo mode
        if os.getenv('DEMO_MODE', '').lower() == 'true':
            seed_demo_data()


if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)

