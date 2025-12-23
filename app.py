# app.py - VERSION 5.1 - FIXED WITH ALL ISSUES RESOLVED
from flask import Flask, render_template, request, session, jsonify, redirect, url_for, send_file
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import random
import string
import os
import json
import logging
from logging.handlers import RotatingFileHandler
from sqlalchemy import func, or_, and_, text, distinct  # ADDED: Import distinct
from functools import wraps
import uuid
import time

# Optional extensions
from flask_cors import CORS
from flask_compress import Compress

# -------------------- Flask app setup --------------------
app = Flask(
    __name__,
    template_folder='templates',
    static_folder='static',
    static_url_path='/static'
)

# Enable CORS and compression
CORS(app)
Compress(app)

# Logging setup with rotation
handler = RotatingFileHandler('msh_cbt.log', maxBytes=1_000_000, backupCount=3)
handler.setLevel(logging.INFO)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('MSH_CBT_HUB')
logger.addHandler(handler)
app.logger.handlers = logger.handlers

# IMPORTANT: SECRET_KEY should be set in environment for production
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'a_temporary_fallback_key_for_dev_only_change_this_in_production')

# Database config
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///msh_cbt_hub.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)

# Initialize DB
db = SQLAlchemy(app)

# -------------------- DATABASE MODELS - V5 ENHANCED --------------------
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    ip_address = db.Column(db.String(50))
    is_activated = db.Column(db.Boolean, default=False)
    is_admin = db.Column(db.Boolean, default=False)
    activation_code = db.Column(db.String(20))
    trial_start = db.Column(db.DateTime)
    trial_end = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    device_id = db.Column(db.String(100))
    last_activity = db.Column(db.DateTime, default=datetime.utcnow)
    # V5: Add fields for localStorage tracking
    browser_data = db.Column(db.Text)  # Store localStorage data as JSON

    # Relationship with exam results
    exam_results = db.relationship('ExamResult', backref='user', lazy=True)
    user_sessions = db.relationship('UserSession', backref='user', lazy=True)

class ActivationCode(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True, nullable=False)
    is_used = db.Column(db.Boolean, default=False)
    used_by = db.Column(db.Integer, db.ForeignKey('user.id'))
    used_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime)

    used_user = db.relationship('User', foreign_keys=[used_by], backref='used_activation_codes')

class ExamResult(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    exam_type = db.Column(db.String(10), nullable=False)
    subjects = db.Column(db.String(500), nullable=False)
    score = db.Column(db.Integer, nullable=False)
    total_questions = db.Column(db.Integer, nullable=False)
    percentage = db.Column(db.Float, nullable=False)
    time_taken = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_answers = db.Column(db.Text)
    questions_data = db.Column(db.Text)
    # V5: Add fields for localStorage sync
    browser_synced = db.Column(db.Boolean, default=False)
    last_sync_time = db.Column(db.DateTime)
    
    # Add a unique constraint to prevent duplicate entries
    __table_args__ = (
        db.UniqueConstraint('user_id', 'exam_type', 'subjects', 'created_at', 
                           name='unique_exam_result'),
    )

class UserSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    session_id = db.Column(db.String(100), nullable=False)
    ip_address = db.Column(db.String(50))
    user_agent = db.Column(db.Text)
    login_time = db.Column(db.DateTime, default=datetime.utcnow)
    last_activity = db.Column(db.DateTime, default=datetime.utcnow)
    logout_time = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    # V5: Add trial timer tracking
    trial_start_time = db.Column(db.DateTime)
    trial_elapsed_seconds = db.Column(db.Integer, default=0)
    trial_paused = db.Column(db.Boolean, default=False)
    last_timer_update = db.Column(db.DateTime)

class TemporaryData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    data_type = db.Column(db.String(50), nullable=False)
    data_key = db.Column(db.String(100), nullable=False)
    data_value = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)

# Ensure tables exist
with app.app_context():
    try:
        db.create_all()
        logger.info("Database tables created successfully")
        
        try:
            # FIXED: Wrapped SQL strings with text() function
            db.session.execute(text('CREATE INDEX IF NOT EXISTS idx_temporary_data_expires ON temporary_data(expires_at)'))
            db.session.execute(text('CREATE INDEX IF NOT EXISTS idx_user_sessions_activity ON user_session(last_activity)'))
            db.session.execute(text('CREATE INDEX IF NOT EXISTS idx_exam_results_user_date ON exam_result(user_id, created_at)'))
            db.session.execute(text('CREATE INDEX IF NOT EXISTS idx_users_last_activity ON user(last_activity)'))
            db.session.commit()
            logger.info("Database indexes created successfully")
        except Exception as index_error:
            logger.warning(f"Index creation warning: {str(index_error)}")
            
    except Exception as e:
        logger.error(f"Error creating database tables: {str(e)}")

# -------------------- HELPERS - V5 ENHANCED --------------------
def generate_activation_code():
    """Generate MSH-XXXX-XXXX format codes"""
    prefix = "MSH-"
    chars = string.ascii_uppercase + string.digits
    first_part = ''.join(random.choices(chars, k=4))
    second_part = ''.join(random.choices(chars, k=4))
    return prefix + first_part + "-" + second_part

def admin_required(f):
    """Decorator to ensure user is logged in and is an admin"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first!'}), 401

        user = User.query.get(session['user_id'])
        if not user or not user.is_admin:
            logger.warning(f"Unauthorized admin access attempt by user: {session.get('user_email', 'Unknown')}")
            return jsonify({'success': False, 'message': 'Forbidden: Admin access required.'}), 403

        return f(*args, **kwargs)
    return decorated_function

def check_trial_status(user):
    """Check if user's trial period is still active"""
    if user.is_activated:
        return True
    
    if user.device_id and user.trial_start:
        trial_end = user.trial_start + timedelta(hours=1)
        return datetime.utcnow() < trial_end
    
    return False

def get_user_stats(user_id):
    """Get user statistics for dashboard"""
    try:
        total_exams = ExamResult.query.filter_by(user_id=user_id).count()

        if total_exams > 0:
            avg_score = db.session.query(func.avg(ExamResult.percentage)).filter_by(user_id=user_id).scalar()
            avg_score = round(avg_score, 1) if avg_score else 0
            
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            recent_exams = ExamResult.query.filter(
                ExamResult.user_id == user_id,
                ExamResult.created_at >= thirty_days_ago
            ).count()
        else:
            avg_score = 0
            recent_exams = 0

        return {
            'total_exams': total_exams,
            'average_score': avg_score,
            'recent_exams': recent_exams
        }
    except Exception as e:
        logger.error(f"Error getting user stats: {str(e)}")
        return {'total_exams': 0, 'average_score': 0, 'recent_exams': 0}

def load_questions_from_file(exam_type, subject):
    """Load questions from JSON files with enhanced error handling"""
    try:
        exam_part = str(exam_type).strip().lower()
        subject_part = str(subject).strip().lower().replace(' ', '_')

        file_name = f"{exam_part}_{subject_part}.json"
        file_path = os.path.join(app.root_path, 'questions', file_name)

        if not os.path.exists(file_path):
            logger.warning(f"Question file not found: {file_path}")
            return None

        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        if 'questions' not in data:
            logger.error(f"Invalid question file structure: {file_path}")
            return None

        # Add subject identifier to each question
        for question in data['questions']:
            question.setdefault('subject', subject_part)

        return data['questions']

    except Exception as e:
        logger.error(f"Error loading questions from {file_name}: {str(e)}")
        return None

def calculate_subject_weights(selected_subjects, exam_type):
    """
    V5 FIX: Calculate weight for each subject based on exam type.
    - WAEC: English gets 5-10 questions (random 5,6,7,8,9,10)
    - JAMB: English gets 10-15 questions (random 10,11,12,13,14,15)
    - Other subjects get proportional distribution of remaining questions
    """
    total_subjects = len(selected_subjects)
    english_weight = 0
    
    # Different English weights based on exam type
    if 'english' in selected_subjects:
        if exam_type.upper() == 'WAEC':
            english_weight = random.randint(5, 10)  # WAEC: 5-10 English questions
        else:  # JAMB
            english_weight = random.randint(10, 15)  # JAMB: 10-15 English questions
    
    # Calculate remaining questions for other subjects
    remaining_questions = 60 - english_weight
    
    # Distribute remaining questions among other subjects
    other_subjects = [s for s in selected_subjects if s != 'english']
    other_subjects_count = len(other_subjects)
    
    if other_subjects_count > 0:
        base_per_subject = remaining_questions // other_subjects_count
        extra_questions = remaining_questions % other_subjects_count
        
        subject_weights = {}
        
        if 'english' in selected_subjects:
            subject_weights['english'] = english_weight
        
        # Distribute base questions
        for subject in other_subjects:
            subject_weights[subject] = base_per_subject
        
        # Distribute extra questions randomly
        subjects_list = other_subjects.copy()
        random.shuffle(subjects_list)
        
        for i in range(extra_questions):
            if i < len(subjects_list):
                subject_weights[subjects_list[i]] += 1
    else:
        # Only English selected (shouldn't happen but handle it)
        subject_weights = {'english': 60}
    
    logger.info(f"Subject weights for {exam_type}: {subject_weights}")
    return subject_weights

def select_questions_for_subject(questions, required_count):
    """Select required number of questions from available pool"""
    if len(questions) <= required_count:
        return questions.copy()
    
    # Shuffle and select required count
    shuffled = questions.copy()
    random.shuffle(shuffled)
    return shuffled[:required_count]

def get_questions_for_exam(exam_type, selected_subjects):
    """
    V5 FIX: Get exactly 60 questions with proper subject distribution.
    Different English question counts for WAEC (5-10) and JAMB (10-15).
    """
    all_questions = []
    
    # Calculate how many questions each subject should get
    subject_weights = calculate_subject_weights([s.lower() for s in selected_subjects], exam_type)
    
    # Load questions for each subject according to weights
    for subject, required_count in subject_weights.items():
        questions = load_questions_from_file(exam_type, subject)
        
        if not questions:
            logger.warning(f"No questions found for {subject}, trying to load from other subjects")
            continue
        
        # Select required number of questions
        selected = select_questions_for_subject(questions, required_count)
        
        if len(selected) < required_count:
            logger.warning(f"Only {len(selected)} questions available for {subject}, expected {required_count}")
        
        all_questions.extend(selected)
    
    # If we still don't have 60 questions, try to fill from available subjects
    if len(all_questions) < 60:
        logger.warning(f"Only {len(all_questions)} questions loaded, trying to fill to 60")
        
        # Try to get more questions from available subjects
        for subject in selected_subjects:
            if len(all_questions) >= 60:
                break
                
            subject_lower = subject.lower()
            questions = load_questions_from_file(exam_type, subject_lower)
            
            if questions:
                # Get questions we haven't used yet
                used_questions = [q.get('question', '') for q in all_questions]
                new_questions = [q for q in questions if q.get('question', '') not in used_questions]
                
                if new_questions:
                    needed = 60 - len(all_questions)
                    to_add = min(needed, len(new_questions))
                    all_questions.extend(new_questions[:to_add])
    
    # Final shuffle
    random.shuffle(all_questions)
    
    # Ensure exactly 60 questions
    if len(all_questions) > 60:
        all_questions = all_questions[:60]
    
    # Log distribution for debugging
    subject_counts = {}
    for question in all_questions:
        subject = question.get('subject', 'unknown')
        subject_counts[subject] = subject_counts.get(subject, 0) + 1
    
    logger.info(f"Final question distribution for {exam_type}: {subject_counts}")
    logger.info(f"Total questions: {len(all_questions)}")
    
    return all_questions

def cleanup_old_data():
    """Auto-delete non-important data after 30 days"""
    try:
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        old_temp_data = TemporaryData.query.filter(TemporaryData.expires_at < datetime.utcnow()).all()
        for data in old_temp_data:
            db.session.delete(data)
        
        old_sessions = UserSession.query.filter(UserSession.last_activity < thirty_days_ago).all()
        for session in old_sessions:
            db.session.delete(session)
        
        db.session.commit()
        
        if old_temp_data or old_sessions:
            logger.info(f"Cleaned up {len(old_temp_data)} temp records and {len(old_sessions)} old sessions")
            
    except Exception as e:
        logger.error(f"Error during data cleanup: {str(e)}")
        db.session.rollback()

def get_device_id():
    """Generate unique device ID for trial restrictions"""
    device_id = session.get('device_id')
    if not device_id:
        device_id = str(uuid.uuid4())
        session['device_id'] = device_id
    return device_id

def update_user_activity(user_id):
    """Update user's last activity timestamp"""
    try:
        user = User.query.get(user_id)
        if user:
            user.last_activity = datetime.utcnow()
            db.session.commit()
    except Exception as e:
        logger.error(f"Error updating user activity: {str(e)}")

# -------------------- TRIAL LOCKOUT MIDDLEWARE --------------------
def trial_lockout_required(allow_access_to_activation=False):
    """Middleware to lock out users with expired trials from all features except activation"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user_id' not in session:
                # Allow login/registration pages
                return f(*args, **kwargs)
            
            user = User.query.get(session['user_id'])
            if not user:
                return f(*args, **kwargs)
            
            # Check if trial has expired and user is not activated
            trial_active = check_trial_status(user)
            if not trial_active and not user.is_activated:
                # User with expired trial - check what they're trying to access
                if allow_access_to_activation:
                    # Allow access to activation-related endpoints
                    return f(*args, **kwargs)
                else:
                    # Block access to all other features
                    logger.warning(f"Trial expired user attempted to access restricted feature: {user.email}")
                    return jsonify({
                        'success': False, 
                        'message': 'Your trial has expired. Please activate your account to continue.',
                        'status': 'trial_expired',
                        'locked_out': True
                    }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# -------------------- ROUTES --------------------
@app.route('/')
def index():
    try:
        return render_template('index.html')
    except Exception as e:
        logger.error(f"Error serving index: {str(e)}")
        return "Welcome to MSH CBT HUB - Platform is starting up...", 200

@app.route('/dashboard')
def dashboard():
    """Serve the dashboard page"""
    try:
        return render_template('index.html')
    except Exception as e:
        logger.error(f"Error serving dashboard: {str(e)}")
        return redirect(url_for('index'))

@app.route('/admin')
def admin():
    """V5.1 FIX: Admin page route - serve admin.html directly"""
    try:
        return render_template('admin.html')
    except Exception as e:
        logger.error(f"Error serving admin page: {str(e)}")
        return "Admin page is not available", 404

# -------------------- AUTH ROUTES --------------------
@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()

        if not data or 'email' not in data or 'password' not in data or 'full_name' not in data:
            return jsonify({'success': False, 'message': 'All fields are required!'})

        email = data['email'].strip().lower()
        password = data['password']
        full_name = data['full_name'].strip()

        if len(full_name) < 2:
            return jsonify({'success': False, 'message': 'Please enter your full name'})

        if len(password) < 6:
            return jsonify({'success': False, 'message': 'Password must be at least 6 characters long'})

        device_id = get_device_id()
        existing_device_user = User.query.filter_by(device_id=device_id).first()
        if existing_device_user and not existing_device_user.is_activated:
            return jsonify({
                'success': False, 
                'message': 'This device has already used the free trial. Please activate your existing account or use a different device.'
            })

        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({'success': False, 'message': 'Email already registered!'})

        hashed_password = generate_password_hash(password)

        # V5 FIX: First user is admin (as you requested)
        is_admin = False
        if User.query.count() == 0:
            logger.info("First user registered - Setting as Admin.")
            is_admin = True

        new_user = User(
            full_name=full_name,
            email=email,
            password=hashed_password,
            ip_address=request.remote_addr,
            trial_start=datetime.utcnow(),
            trial_end=datetime.utcnow() + timedelta(hours=1),
            is_admin=is_admin,
            device_id=device_id,
            last_activity=datetime.utcnow()
        )

        db.session.add(new_user)
        db.session.commit()

        logger.info(f"New user registered: {email} (Admin: {is_admin})")

        return jsonify({
            'success': True,
            'message': 'Registration successful! You have 1 hour free trial to explore all features.',
            'user_name': full_name,
            'is_admin': is_admin  # V5 FIX: Return admin status
        })

    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Registration failed. Please try again.'})

@app.route('/login', methods=['POST'])
@trial_lockout_required(allow_access_to_activation=True)  # Allow login even with expired trial
def login():
    try:
        data = request.get_json()

        if not data or 'email' not in data or 'password' not in data:
            return jsonify({'success': False, 'message': 'Email and password are required!'})

        email = data['email'].strip().lower()
        password = data['password']

        user = User.query.filter_by(email=email).first()

        if user and check_password_hash(user.password, password):
            trial_active = check_trial_status(user)
            
            # Check if trial expired
            if not trial_active and not user.is_activated:
                # Trial expired - allow login but set expired status
                user.last_login = datetime.utcnow()
                user.last_activity = datetime.utcnow()
                db.session.commit()

                session['user_id'] = user.id
                session['user_name'] = user.full_name
                session['user_email'] = user.email
                session['is_activated'] = user.is_activated
                session['is_admin'] = user.is_admin
                session['device_id'] = user.device_id
                session['trial_expired'] = True  # Mark trial as expired in session
                session.permanent = True

                logger.info(f"Expired trial user logged in: {email}")

                return jsonify({
                    'success': True,
                    'message': 'Login successful. Your trial has expired. Please activate your account to continue.',
                    'user_name': user.full_name,
                    'is_activated': user.is_activated,
                    'is_admin': user.is_admin,
                    'trial_active': False,
                    'trial_expired': True,
                    'device_id': user.device_id,
                    'locked_out': True
                })

            user.last_login = datetime.utcnow()
            user.last_activity = datetime.utcnow()
            
            new_session = UserSession(
                user_id=user.id,
                session_id=str(uuid.uuid4()),
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent'),
                trial_start_time=datetime.utcnow(),
                last_timer_update=datetime.utcnow()
            )
            db.session.add(new_session)
            
            db.session.commit()

            session['user_id'] = user.id
            session['user_name'] = user.full_name
            session['user_email'] = user.email
            session['is_activated'] = user.is_activated
            session['is_admin'] = user.is_admin
            session['device_id'] = user.device_id
            session['trial_expired'] = False
            session.permanent = True

            logger.info(f"User logged in: {email} (Admin: {user.is_admin})")

            return jsonify({
                'success': True,
                'message': 'Login successful! Welcome back.',
                'user_name': user.full_name,
                'is_activated': user.is_activated,
                'is_admin': user.is_admin,
                'trial_active': trial_active,
                'device_id': user.device_id
            })

        return jsonify({'success': False, 'message': 'Invalid email or password!'})

    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({'success': False, 'message': 'Login failed. Please try again.'})

@app.route('/logout')
def logout():
    try:
        user_name = session.get('user_name', 'User')
        
        if 'user_id' in session:
            active_session = UserSession.query.filter_by(
                user_id=session['user_id'], 
                is_active=True
            ).order_by(UserSession.login_time.desc()).first()
            
            if active_session:
                active_session.is_active = False
                active_session.logout_time = datetime.utcnow()
                db.session.commit()
        
        session.clear()
        logger.info(f"User logged out: {user_name}")
        return jsonify({'success': True, 'message': 'Logged out successfully!'})
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        return jsonify({'success': False, 'message': 'Logout failed.'})

# -------------------- USER MANAGEMENT --------------------
@app.route('/api/user-status')
@trial_lockout_required(allow_access_to_activation=True)  # Allow status check for activation
def user_status():
    try:
        if 'user_id' not in session:
            return jsonify({'active': False})

        user = User.query.get(session['user_id'])
        if not user:
            session.clear()
            return jsonify({'active': False})

        session['is_activated'] = user.is_activated
        session['is_admin'] = user.is_admin

        trial_active = check_trial_status(user)
        
        # V5: Calculate remaining trial time
        remaining_seconds = 0
        if user.trial_end and trial_active:
            remaining_seconds = max(0, int((user.trial_end - datetime.utcnow()).total_seconds()))
        elif user.trial_end and not trial_active:
            remaining_seconds = 0
        
        # Check if trial has expired
        if not trial_active and not user.is_activated:
            session['trial_expired'] = True
            return jsonify({
                'active': True,
                'status': 'expired',
                'user_name': user.full_name,
                'user_email': user.email,
                'is_admin': user.is_admin,
                'remaining_seconds': 0,
                'locked_out': True,
                'message': 'Your trial has expired. Please activate your account.'
            })

        if user.is_activated:
            return jsonify({
                'active': True,
                'status': 'activated',
                'user_name': user.full_name,
                'user_email': user.email,
                'is_admin': user.is_admin,
                'remaining_seconds': remaining_seconds
            })

        if trial_active:
            return jsonify({
                'active': True,
                'status': 'trial',
                'user_name': user.full_name,
                'user_email': user.email,
                'remaining_minutes': remaining_seconds // 60,
                'remaining_seconds': remaining_seconds,
                'is_admin': user.is_admin
            })

        return jsonify({
            'active': False, 
            'status': 'expired',
            'user_name': user.full_name,
            'user_email': user.email,
            'is_admin': user.is_admin,
            'locked_out': True
        })

    except Exception as e:
        logger.error(f"User status error: {str(e)}")
        return jsonify({'active': False})

@app.route('/api/user/stats')
@trial_lockout_required()  # Lock out expired trial users
def user_stats():
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first!'})

        stats = get_user_stats(session['user_id'])
        return jsonify({'success': True, 'stats': stats})

    except Exception as e:
        logger.error(f"User stats error: {str(e)}")
        return jsonify({'success': False, 'message': 'Error loading statistics'})

@app.route('/api/user/recent-activity')
@trial_lockout_required()  # Lock out expired trial users
def user_recent_activity():
    """V5.1 FIX: Get unique recent activities without duplication"""
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first!'})

        # V5.1 FIX: Use distinct to get unique activities and order by most recent
        recent_exams = ExamResult.query.filter_by(
            user_id=session['user_id']
        ).order_by(ExamResult.created_at.desc()).all()

        # Use a dictionary to track unique activities based on multiple criteria
        unique_activities = {}
        activities = []
        
        for exam in recent_exams:
            # Create a unique key based on exam characteristics to avoid duplicates
            activity_key = f"{exam.exam_type}_{exam.subjects}_{exam.score}_{exam.total_questions}_{exam.created_at.strftime('%Y-%m-%d %H')}"
            
            # Only add if we haven't seen this activity before
            if activity_key not in unique_activities:
                unique_activities[activity_key] = True
                
                activities.append({
                    'id': exam.id,
                    'exam_type': exam.exam_type,
                    'subjects': exam.subjects,
                    'score': exam.score,
                    'total_questions': exam.total_questions,
                    'percentage': exam.percentage,
                    'date': exam.created_at.isoformat(),
                    'time_taken': exam.time_taken
                })
                
                # Limit to 10 unique activities
                if len(activities) >= 10:
                    break

        logger.info(f"Returning {len(activities)} unique recent activities for user {session['user_id']}")
        
        return jsonify({
            'success': True,
            'activities': activities
        })

    except Exception as e:
        logger.error(f"Recent activity error: {str(e)}")
        return jsonify({'success': False, 'message': 'Error loading recent activity'})

# -------------------- LOCAL STORAGE SYNC API (V5 NEW FEATURE) --------------------
@app.route('/api/user/sync-browser-data', methods=['POST'])
@trial_lockout_required(allow_access_to_activation=True)  # Allow sync for activation
def sync_browser_data():
    """V5: Sync localStorage data from browser to server"""
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first!'})

        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'No data received!'})

        user = User.query.get(session['user_id'])
        if not user:
            return jsonify({'success': False, 'message': 'User not found!'})

        # Store browser data
        user.browser_data = json.dumps(data)
        user.last_activity = datetime.utcnow()
        
        # Handle exam results sync with duplication check
        if 'exam_results' in data and data['exam_results']:
            try:
                for result_data in data['exam_results']:
                    # Check if result already exists using multiple criteria
                    existing_result = ExamResult.query.filter_by(
                        user_id=user.id,
                        exam_type=result_data.get('exam_type'),
                        subjects=result_data.get('subjects'),
                        score=result_data.get('score'),
                        total_questions=result_data.get('total_questions')
                    ).first()
                    
                    if not existing_result:
                        # Create new exam result from localStorage
                        new_result = ExamResult(
                            user_id=user.id,
                            exam_type=result_data.get('exam_type'),
                            subjects=result_data.get('subjects'),
                            score=result_data.get('score'),
                            total_questions=result_data.get('total_questions'),
                            percentage=result_data.get('percentage'),
                            time_taken=result_data.get('time_taken'),
                            created_at=datetime.fromisoformat(result_data.get('date').replace('Z', '+00:00')),
                            user_answers=json.dumps(result_data.get('user_answers', {})),
                            questions_data=json.dumps(result_data.get('questions', [])),
                            browser_synced=True,
                            last_sync_time=datetime.utcnow()
                        )
                        db.session.add(new_result)
            except Exception as e:
                logger.error(f"Error syncing exam results: {str(e)}")

        db.session.commit()
        update_user_activity(session['user_id'])
        
        return jsonify({
            'success': True,
            'message': 'Browser data synced successfully!',
            'sync_time': datetime.utcnow().isoformat()
        })

    except Exception as e:
        logger.error(f"Browser data sync error: {str(e)}")
        return jsonify({'success': False, 'message': 'Error syncing browser data'})

@app.route('/api/user/get-browser-data')
@trial_lockout_required(allow_access_to_activation=True)  # Allow browser data for activation
def get_browser_data():
    """V5: Get browser data from server"""
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first!'})

        user = User.query.get(session['user_id'])
        if not user:
            return jsonify({'success': False, 'message': 'User not found!'})

        browser_data = {}
        if user.browser_data:
            browser_data = json.loads(user.browser_data)

        # Get exam results for this user with uniqueness
        exam_results = ExamResult.query.filter_by(user_id=user.id).order_by(ExamResult.created_at.desc()).limit(20).all()
        
        results_data = []
        seen_results = set()
        
        for result in exam_results:
            # Create a unique identifier for this result
            result_key = f"{result.exam_type}_{result.subjects}_{result.score}_{result.total_questions}"
            
            # Skip if we've already seen this result
            if result_key in seen_results:
                continue
                
            seen_results.add(result_key)
            
            results_data.append({
                'id': result.id,
                'exam_type': result.exam_type,
                'subjects': result.subjects.split(',') if result.subjects else [],
                'score': result.score,
                'total_questions': result.total_questions,
                'percentage': result.percentage,
                'time_taken': result.time_taken,
                'date': result.created_at.isoformat(),
                'browser_synced': result.browser_synced
            })

        return jsonify({
            'success': True,
            'browser_data': browser_data,
            'exam_results': results_data,
            'last_activity': user.last_activity.isoformat() if user.last_activity else None,
            'trial_end': user.trial_end.isoformat() if user.trial_end else None
        })

    except Exception as e:
        logger.error(f"Get browser data error: {str(e)}")
        return jsonify({'success': False, 'message': 'Error loading browser data'})

# -------------------- TRIAL TIMER TRACKING (V5 NEW FEATURE) --------------------
@app.route('/api/user/trial-timer', methods=['POST'])
@trial_lockout_required(allow_access_to_activation=True)  # Allow timer updates for activation
def update_trial_timer():
    """V5: Update trial timer from client (works even offline)"""
    try:
        if 'user_id' not in session and 'device_id' in session:
            # Try to find user by device_id for trial users
            user = User.query.filter_by(device_id=session.get('device_id')).first()
            if not user:
                return jsonify({'success': False, 'message': 'User not found!'})
            session['user_id'] = user.id
        elif 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first!'})

        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'No timer data received!'})

        user = User.query.get(session['user_id'])
        if not user:
            return jsonify({'success': False, 'message': 'User not found!'})

        # Update trial timer in session
        active_session = UserSession.query.filter_by(
            user_id=user.id,
            is_active=True
        ).order_by(UserSession.login_time.desc()).first()

        if active_session:
            active_session.trial_elapsed_seconds = data.get('elapsed_seconds', 0)
            active_session.last_timer_update = datetime.utcnow()
            active_session.last_activity = datetime.utcnow()

        # Update user's last activity
        user.last_activity = datetime.utcnow()
        
        # Calculate remaining trial time
        if user.trial_start and not user.is_activated:
            total_trial_seconds = 3600  # 1 hour
            elapsed_seconds = data.get('elapsed_seconds', 0)
            remaining_seconds = max(0, total_trial_seconds - elapsed_seconds)
            
            # Update trial end time if needed
            if not user.trial_end or user.trial_end < datetime.utcnow():
                user.trial_end = datetime.utcnow() + timedelta(seconds=remaining_seconds)

        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Trial timer updated',
            'elapsed_seconds': data.get('elapsed_seconds', 0),
            'last_update': datetime.utcnow().isoformat()
        })

    except Exception as e:
        logger.error(f"Trial timer update error: {str(e)}")
        return jsonify({'success': False, 'message': 'Error updating trial timer'})

@app.route('/api/user/trial-status')
@trial_lockout_required(allow_access_to_activation=True)  # Allow status check for activation
def get_trial_status():
    """V5: Get current trial status"""
    try:
        if 'user_id' not in session and 'device_id' in session:
            user = User.query.filter_by(device_id=session.get('device_id')).first()
            if not user:
                return jsonify({'success': False, 'message': 'User not found!'})
        elif 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first!'})
        else:
            user = User.query.get(session['user_id'])
            if not user:
                return jsonify({'success': False, 'message': 'User not found!'})

        trial_active = check_trial_status(user)
        remaining_seconds = 0
        
        if user.trial_end and trial_active:
            remaining_seconds = max(0, int((user.trial_end - datetime.utcnow()).total_seconds()))
        
        # Get active session timer
        active_session = UserSession.query.filter_by(
            user_id=user.id,
            is_active=True
        ).order_by(UserSession.login_time.desc()).first()
        
        elapsed_seconds = active_session.trial_elapsed_seconds if active_session else 0
        
        # Check if trial expired
        if not trial_active and not user.is_activated:
            return jsonify({
                'success': True,
                'trial_active': False,
                'is_activated': False,
                'remaining_seconds': 0,
                'elapsed_seconds': elapsed_seconds,
                'trial_start': user.trial_start.isoformat() if user.trial_start else None,
                'trial_end': user.trial_end.isoformat() if user.trial_end else None,
                'trial_expired': True,
                'locked_out': True,
                'message': 'Your trial has expired. Please activate your account.'
            })
        
        return jsonify({
            'success': True,
            'trial_active': trial_active,
            'is_activated': user.is_activated,
            'remaining_seconds': remaining_seconds,
            'elapsed_seconds': elapsed_seconds,
            'trial_start': user.trial_start.isoformat() if user.trial_start else None,
            'trial_end': user.trial_end.isoformat() if user.trial_end else None
        })

    except Exception as e:
        logger.error(f"Get trial status error: {str(e)}")
        return jsonify({'success': False, 'message': 'Error getting trial status'})

# -------------------- ACTIVATION SYSTEM --------------------
@app.route('/activate', methods=['POST'])
@trial_lockout_required(allow_access_to_activation=True)  # Allow activation for expired trials
def activate_account():
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first!'})

        data = request.get_json()
        if not data or 'code' not in data:
            return jsonify({'success': False, 'message': 'Activation code is required!'})

        code = data['code'].upper().strip()

        import re
        code_pattern = re.compile(r'^MSH-[A-Z0-9]{4}-[A-Z0-9]{4}$')
        if not code_pattern.match(code):
            return jsonify({'success': False, 'message': 'Invalid activation code format! Format should be MSH-XXXX-XXXX'})

        activation_code = ActivationCode.query.filter_by(code=code, is_used=False).first()

        if not activation_code:
            return jsonify({'success': False, 'message': 'Invalid or already used activation code!'})

        if activation_code.expires_at and datetime.utcnow() > activation_code.expires_at:
            return jsonify({'success': False, 'message': 'This activation code has expired!'})

        user = User.query.get(session['user_id'])
        user.is_activated = True
        user.activation_code = code
        user.last_activity = datetime.utcnow()

        activation_code.is_used = True
        activation_code.used_by = user.id
        activation_code.used_at = datetime.utcnow()

        db.session.commit()

        session['is_activated'] = True
        session['trial_expired'] = False  # Clear trial expired flag

        logger.info(f"User activated: {user.email} with code: {code}")

        return jsonify({
            'success': True,
            'message': 'Account activated successfully! Enjoy full access to MSH CBT HUB.'
        })

    except Exception as e:
        logger.error(f"Activation error: {str(e)}")
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Activation failed. Please try again.'})

# -------------------- EXAM SYSTEM - V5 CRITICAL FIXES --------------------
@app.route('/api/start-exam', methods=['POST'])
@trial_lockout_required()  # Lock out expired trial users
def start_exam():
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first!'})

        user = User.query.get(session['user_id'])
        if not user:
            session.clear()
            return jsonify({'success': False, 'message': 'Session expired. Please login again.'})

        trial_active = check_trial_status(user)
        if not trial_active and not user.is_activated:
            return jsonify({
                'success': False, 
                'message': 'Your access has expired. Please activate your account.',
                'locked_out': True
            })

        return jsonify({'success': True, 'message': 'Exam access granted!'})

    except Exception as e:
        logger.error(f"Start exam error: {str(e)}")
        return jsonify({'success': False, 'message': 'Error starting exam.'})

@app.route('/api/get-questions', methods=['POST'])
@trial_lockout_required()  # Lock out expired trial users
def get_questions():
    """
    V5 FIX: Enhanced question loading with exactly 60 questions.
    - WAEC: English gets 5-10 questions
    - JAMB: English gets 10-15 questions
    - Other subjects get proportional distribution
    """
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first!'})

        data = request.get_json()
        exam_type = data.get('exam_type')
        subjects = data.get('subjects', [])

        if not exam_type or not subjects:
            return jsonify({'success': False, 'message': 'Exam type and subjects are required!'})

        # Validation
        if exam_type.upper() == 'WAEC' and len(subjects) != 9:
            return jsonify({
                'success': False, 
                'message': 'WAEC requires exactly 9 subjects (English, Mathematics + 7 others). Please check your selection.'
            })

        if exam_type.upper() == 'JAMB' and len(subjects) != 4:
            return jsonify({
                'success': False, 
                'message': 'JAMB requires exactly 4 subjects (English + 3 others). Please check your selection.'
            })

        if exam_type.upper() == 'WAEC':
            if 'english' not in [s.lower() for s in subjects] or 'mathematics' not in [s.lower() for s in subjects]:
                return jsonify({
                    'success': False, 
                    'message': 'WAEC requires both English Language and Mathematics as compulsory subjects.'
                })

        if exam_type.upper() == 'JAMB':
            if 'english' not in [s.lower() for s in subjects]:
                return jsonify({
                    'success': False, 
                    'message': 'JAMB requires English Language as a compulsory subject.'
                })

        # V5 FIX: Use new question loading with proper English distribution
        all_questions = get_questions_for_exam(exam_type, subjects)

        if not all_questions:
            return jsonify({
                'success': False, 
                'message': 'No questions found for the selected subjects! Please try different subjects.'
            })

        # Final check: Ensure we have exactly 60 questions
        if len(all_questions) != 60:
            logger.warning(f"Expected 60 questions, but got {len(all_questions)}. Adjusting...")
            # Try to get more questions if we have less
            if len(all_questions) < 60:
                # Try to load additional questions from English (usually has many)
                if 'english' in [s.lower() for s in subjects]:
                    english_questions = load_questions_from_file(exam_type, 'english')
                    if english_questions:
                        used_questions = [q.get('question', '') for q in all_questions]
                        new_questions = [q for q in english_questions 
                                       if q.get('question', '') not in used_questions]
                        needed = 60 - len(all_questions)
                        to_add = min(needed, len(new_questions))
                        all_questions.extend(new_questions[:to_add])
            
            # Final shuffle
            random.shuffle(all_questions)
            
            # Ensure exactly 60
            if len(all_questions) > 60:
                all_questions = all_questions[:60]

        # Log final distribution
        subject_counts = {}
        for question in all_questions:
            subject = question.get('subject', 'unknown')
            subject_counts[subject] = subject_counts.get(subject, 0) + 1

        logger.info(f"Loaded {len(all_questions)} questions for {exam_type} - Final distribution: {subject_counts}")

        # V5 FIX: Add question IDs for frontend tracking
        for i, question in enumerate(all_questions):
            question['id'] = i
            question['selected_answer'] = None

        return jsonify({
            'success': True,
            'questions': all_questions,
            'total_questions': len(all_questions),
            'subject_distribution': subject_counts,
            'exam_type': exam_type,
            'message': f"Loaded {len(all_questions)} questions with English distribution: WAEC=5-10, JAMB=10-15"
        })

    except Exception as e:
        logger.error(f"Get questions error: {str(e)}")
        return jsonify({'success': False, 'message': f'Error loading questions: {str(e)}'})

@app.route('/api/submit-exam', methods=['POST'])
@trial_lockout_required()  # Lock out expired trial users
def submit_exam():
    """
    V5 FIX: Enhanced exam submission with stable results.
    """
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first!'})

        data = request.get_json()
        
        # V5 FIX: Better validation
        if not data:
            return jsonify({'success': False, 'message': 'No data received!'})
        
        user_answers = data.get('user_answers', {})
        questions = data.get('questions', [])
        exam_type = data.get('exam_type', '')
        subjects = data.get('subjects', [])

        if not questions:
            return jsonify({'success': False, 'message': 'No questions data!'})

        correct = 0
        subject_scores = {}

        # Calculate scores
        for i, question in enumerate(questions):
            user_answer = user_answers.get(str(i))
            subject = question.get('subject', 'Unknown').lower()

            if subject not in subject_scores:
                subject_scores[subject] = {'total': 0, 'correct': 0}

            subject_scores[subject]['total'] += 1

            if user_answer and user_answer.upper() == question.get('correct_answer', '').upper():
                correct += 1
                subject_scores[subject]['correct'] += 1

        total_questions = len(questions)
        percentage = round((correct / total_questions) * 100, 2) if total_questions > 0 else 0

        # Save result to database with duplicate check
        try:
            new_result = ExamResult(
                user_id=session['user_id'],
                exam_type=exam_type,
                subjects=','.join(subjects),
                score=correct,
                total_questions=total_questions,
                percentage=percentage,
                time_taken=data.get('time_taken', 0),
                user_answers=json.dumps(user_answers),
                questions_data=json.dumps(questions),
                last_sync_time=datetime.utcnow()
            )

            db.session.add(new_result)
            db.session.commit()

            logger.info(f"Exam submitted - User: {session['user_id']}, Type: {exam_type}, "
                       f"Score: {correct}/${total_questions} ({percentage}%)")
        except Exception as db_error:
            # If duplicate, find existing result
            logger.warning(f"Possible duplicate exam result: {str(db_error)}")
            existing_result = ExamResult.query.filter_by(
                user_id=session['user_id'],
                exam_type=exam_type,
                subjects=','.join(subjects),
                score=correct,
                total_questions=total_questions
            ).first()
            
            if existing_result:
                new_result = existing_result
            else:
                raise db_error

        # V5 FIX: Return complete results data for immediate display
        return jsonify({
            'success': True,
            'message': 'Exam submitted successfully!',
            'score': correct,
            'total_questions': total_questions,
            'percentage': percentage,
            'subject_scores': subject_scores,
            'result_id': new_result.id,
            'exam_type': exam_type,
            'subjects': subjects,
            'created_at': new_result.created_at.isoformat(),
            'time_taken': data.get('time_taken', 0)
        })

    except Exception as e:
        logger.error(f"Submit exam error: {str(e)}")
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error submitting exam: {str(e)}'})

@app.route('/api/exam-results/<int:result_id>')
@trial_lockout_required()  # Lock out expired trial users
def get_exam_result(result_id):
    """
    V5 FIX: Enhanced results retrieval with stable data.
    """
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first!'})

        result = ExamResult.query.filter_by(id=result_id, user_id=session['user_id']).first()

        if not result:
            return jsonify({'success': False, 'message': 'Result not found!'})

        # Parse stored data
        user_answers = json.loads(result.user_answers) if result.user_answers else {}
        questions = json.loads(result.questions_data) if result.questions_data else []
        subjects_list = result.subjects.split(',') if result.subjects else []

        # V5 FIX: Calculate subject scores for display
        subject_scores = {}
        if questions:
            for i, question in enumerate(questions):
                subject = question.get('subject', 'Unknown').lower()
                if subject not in subject_scores:
                    subject_scores[subject] = {'total': 0, 'correct': 0}
                
                subject_scores[subject]['total'] += 1
                
                user_answer = user_answers.get(str(i))
                if user_answer and user_answer.upper() == question.get('correct_answer', '').upper():
                    subject_scores[subject]['correct'] += 1

        return jsonify({
            'success': True,
            'result': {
                'id': result.id,
                'exam_type': result.exam_type,
                'subjects': subjects_list,
                'score': result.score,
                'total_questions': result.total_questions,
                'percentage': result.percentage,
                'time_taken': result.time_taken,
                'created_at': result.created_at.isoformat(),
                'user_answers': user_answers,
                'questions': questions,
                'subject_scores': subject_scores
            }
        })

    except Exception as e:
        logger.error(f"Get exam result error: {str(e)}")
        return jsonify({'success': False, 'message': 'Error loading exam result.'})

# -------------------- ADMIN ROUTES --------------------
@app.route('/api/generate-codes', methods=['POST'])
@admin_required
def generate_codes():
    try:
        codes = []
        for _ in range(100):
            code = generate_activation_code()
            expires_at = datetime.utcnow() + timedelta(days=150)

            while ActivationCode.query.filter_by(code=code).first():
                code = generate_activation_code()

            activation_code = ActivationCode(
                code=code,
                expires_at=expires_at
            )
            db.session.add(activation_code)
            codes.append(code)

        db.session.commit()

        logger.info(f"Generated 100 activation codes with enhanced format by Admin: {session.get('user_email')}")

        return jsonify({
            'success': True,
            'message': '100 activation codes generated successfully with enhanced format MSH-XXXX-XXXX!',
            'codes': codes
        })

    except Exception as e:
        logger.error(f"Generate codes error: {str(e)}")
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error generating codes: {str(e)}'})

@app.route('/api/admin/stats')
@admin_required
def admin_stats():
    try:
        total_users = User.query.count()
        activated_users = User.query.filter_by(is_activated=True).count()
        total_codes = ActivationCode.query.count()
        used_codes = ActivationCode.query.filter_by(is_used=True).count()
        total_exams = ExamResult.query.count()

        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_users = User.query.filter(User.created_at >= week_ago).count()
        recent_exams = ExamResult.query.filter(ExamResult.created_at >= week_ago).count()

        active_trials = User.query.filter_by(is_activated=False).count()
        expired_trials = User.query.filter(
            User.is_activated == False,
            User.trial_start < (datetime.utcnow() - timedelta(hours=1))
        ).count()

        # V5: Get localStorage sync stats
        users_with_browser_data = User.query.filter(User.browser_data.isnot(None)).count()
        browser_synced_results = ExamResult.query.filter_by(browser_synced=True).count()

        return jsonify({
            'success': True,
            'stats': {
                'total_users': total_users,
                'activated_users': activated_users,
                'active_trials': active_trials,
                'expired_trials': expired_trials,
                'total_codes': total_codes,
                'used_codes': used_codes,
                'total_exams': total_exams,
                'recent_users': recent_users,
                'recent_exams': recent_exams,
                'users_with_browser_data': users_with_browser_data,
                'browser_synced_results': browser_synced_results
            }
        })

    except Exception as e:
        logger.error(f"Admin stats error: {str(e)}")
        return jsonify({'success': False, 'message': 'Error loading admin statistics.'})

@app.route('/api/admin/users')
@admin_required
def admin_users():
    try:
        user_exam_counts = db.session.query(
            User,
            func.count(ExamResult.id).label('exam_count')
        ).outerjoin(ExamResult).group_by(User.id).order_by(User.created_at.desc()).all()

        users_data = []
        for user, exam_count in user_exam_counts:
            trial_status = 'Activated' if user.is_activated else 'Admin' if user.is_admin else 'Trial'
            if trial_status == 'Trial':
                trial_active = check_trial_status(user)
                trial_status = 'Active Trial' if trial_active else 'Expired Trial'

            # V5: Get last activity
            last_activity_str = 'Never'
            if user.last_activity:
                last_activity_str = user.last_activity.strftime('%Y-%m-%d %H:%M')
            
            users_data.append({
                'id': user.id,
                'name': user.full_name,
                'email': user.email,
                'ip_address': user.ip_address,
                'status': trial_status,
                'exam_count': exam_count,
                'join_date': user.created_at.strftime('%Y-%m-%d %H:%M'),
                'last_login': user.last_login.strftime('%Y-%m-%d %H:%M') if user.last_login else 'Never',
                'last_activity': last_activity_str,
                'activation_code': user.activation_code,
                'device_id': user.device_id,
                'has_browser_data': bool(user.browser_data)
            })

        return jsonify({'success': True, 'users': users_data})

    except Exception as e:
        logger.error(f"Admin users error: {str(e)}")
        return jsonify({'success': False, 'message': 'Error loading users.'})

@app.route('/api/admin/codes')
@admin_required
def admin_codes():
    try:
        codes = ActivationCode.query.order_by(ActivationCode.created_at.desc()).all()
        codes_data = []

        for code in codes:
            used_by_name = code.used_user.full_name if code.used_user else 'N/A'

            codes_data.append({
                'id': code.id,
                'code': code.code,
                'used': code.is_used,
                'used_by': used_by_name,
                'created_at': code.created_at.strftime('%Y-%m-%d'),
                'expires_at': code.expires_at.strftime('%Y-%m-%d') if code.expires_at else None,
                'used_at': code.used_at.strftime('%Y-%m-%d %H:%M') if code.used_at else None
            })

        return jsonify({'success': True, 'codes': codes_data})

    except Exception as e:
        logger.error(f"Admin codes error: {str(e)}")
        return jsonify({'success': False, 'message': 'Error loading activation codes.'})

# -------------------- ERROR HANDLERS --------------------
@app.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'message': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({'success': False, 'message': 'Internal server error'}), 500

@app.errorhandler(413)
def too_large(error):
    return jsonify({'success': False, 'message': 'File too large'}), 413

# -------------------- HEALTH CHECK --------------------
@app.route('/health')
def health_check():
    try:
        db.session.execute(text('SELECT 1'))
        old_data_count = TemporaryData.query.filter(TemporaryData.expires_at < datetime.utcnow()).count()
        
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'database': 'connected',
            'pending_cleanup': old_data_count,
            'version': '5.1',
            'features': ['unique_recent_activities', 'admin_dashboard_fix', 'jamb_results_fix', 'trial_lockout']
        })
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'timestamp': datetime.utcnow().isoformat(),
            'database': 'disconnected',
            'error': str(e)
        }), 500

# -------------------- APPLICATION STARTUP --------------------
def initialize_application():
    try:
        with app.app_context():
            if ActivationCode.query.count() == 0:
                logger.info("Creating initial activation codes...")
                for _ in range(10):
                    code = generate_activation_code()
                    expires_at = datetime.utcnow() + timedelta(days=150)
                    activation_code = ActivationCode(code=code, expires_at=expires_at)
                    db.session.add(activation_code)
                db.session.commit()
                logger.info("Initial activation codes created")
            
            logger.info("MSH CBT HUB Application V5.1 Initialized Successfully")
            logger.info("V5.1 Features: Unique Recent Activities, Admin Dashboard Fix, JAMB Results Fix, Trial Lockout")
    except Exception as e:
        logger.error(f"Application initialization failed: {str(e)}")

initialize_application()

# -------------------- RUN --------------------
if __name__ == '__main__':
    print("🚀 Starting MSH CBT HUB Server - VERSION 5.1...")
    print("✅ All V5.1 requirements implemented:")
    print("   ✅ FIXED: Admin Dashboard Route - Now properly serves admin.html")
    print("   ✅ FIXED: Recent Activity Duplication - Unique activities only")
    print("   ✅ FIXED: JAMB Results - No more disappearing results")
    print("   ✅ ADDED: Trial Lockout System - Users locked out after trial ends")
    print("   ✅ ADDED: Activation Only Access - Expired users can only access activation")
    print("   ✅ ADDED: Complete Feature Block - All features disabled for expired trials")
    print("⚠️  IMPORTANT: Ensure you set the SECRET_KEY environment variable!")
    print("📁 Running with templates/ and static/ folders")
    print("📝 Note: Ensure question JSON files exist in questions/ folder")
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
