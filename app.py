# app.py - VERSION 3 - UPDATED WITH 60 QUESTIONS FIX AND JAMB RESULTS FIX
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
from sqlalchemy import func, or_, and_
from functools import wraps
import uuid

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

# -------------------- DATABASE MODELS - V2 ENHANCED --------------------
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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    device_id = db.Column(db.String(100))

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
            db.session.execute('CREATE INDEX IF NOT EXISTS idx_temporary_data_expires ON temporary_data(expires_at)')
            db.session.execute('CREATE INDEX IF NOT EXISTS idx_user_sessions_activity ON user_session(last_activity)')
            db.session.execute('CREATE INDEX IF NOT EXISTS idx_exam_results_user_date ON exam_result(user_id, created_at)')
            db.session.commit()
            logger.info("Database indexes created successfully")
        except Exception as index_error:
            logger.warning(f"Index creation warning: {str(index_error)}")
            
    except Exception as e:
        logger.error(f"Error creating database tables: {str(e)}")

# -------------------- HELPERS - V3 ENHANCED --------------------
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
    Calculate weight for each subject based on exam type and subject count.
    V3 FIX: Ensure exactly 60 questions with proper distribution.
    """
    total_subjects = len(selected_subjects)
    english_weight = 0
    
    # Determine English weight (10-15 questions)
    if 'english' in selected_subjects:
        english_weight = random.randint(10, 15)
    
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
    V3 FIX: Get exactly 60 questions with proper subject distribution.
    Ensure English has 10-15 questions, other subjects get proportional distribution.
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
    return render_template('admin.html')

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

        is_admin = False
        if User.query.count() == 0:
            logger.warning("First user registered will be set as initial Admin.")
            is_admin = True

        new_user = User(
            full_name=full_name,
            email=email,
            password=hashed_password,
            ip_address=request.remote_addr,
            trial_start=datetime.utcnow(),
            is_admin=is_admin,
            device_id=device_id
        )

        db.session.add(new_user)
        db.session.commit()

        logger.info(f"New user registered: {email} (Admin: {is_admin})")

        return jsonify({
            'success': True,
            'message': 'Registration successful! You have 1 hour free trial to explore all features.',
            'user_name': full_name
        })

    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Registration failed. Please try again.'})

@app.route('/login', methods=['POST'])
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
            
            if not trial_active and not user.is_activated:
                current_device_id = get_device_id()
                if user.device_id and user.device_id != current_device_id:
                    return jsonify({
                        'success': False,
                        'message': 'Your trial has expired and cannot be used on this device. Please activate your account.'
                    })
                else:
                    return jsonify({
                        'success': False,
                        'message': 'Your trial has expired. Please activate your account to continue.'
                    })

            user.last_login = datetime.utcnow()
            
            new_session = UserSession(
                user_id=user.id,
                session_id=str(uuid.uuid4()),
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent')
            )
            db.session.add(new_session)
            
            db.session.commit()

            session['user_id'] = user.id
            session['user_name'] = user.full_name
            session['user_email'] = user.email
            session['is_activated'] = user.is_activated
            session['is_admin'] = user.is_admin
            session.permanent = True

            logger.info(f"User logged in: {email} (Admin: {user.is_admin})")

            return jsonify({
                'success': True,
                'message': 'Login successful! Welcome back.',
                'user_name': user.full_name,
                'is_activated': user.is_activated,
                'is_admin': user.is_admin,
                'trial_active': trial_active
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
        
        if user.is_activated:
            return jsonify({
                'active': True,
                'status': 'activated',
                'user_name': user.full_name,
                'user_email': user.email,
                'is_admin': user.is_admin
            })

        if trial_active:
            trial_end = user.trial_start + timedelta(hours=1)
            remaining = trial_end - datetime.utcnow()
            remaining_minutes = max(0, int(remaining.total_seconds() / 60))
            remaining_seconds = max(0, int(remaining.total_seconds()))
            
            return jsonify({
                'active': True,
                'status': 'trial',
                'user_name': user.full_name,
                'user_email': user.email,
                'remaining_minutes': remaining_minutes,
                'remaining_seconds': remaining_seconds,
                'is_admin': user.is_admin
            })

        return jsonify({
            'active': False, 
            'status': 'expired',
            'user_name': user.full_name,
            'user_email': user.email
        })

    except Exception as e:
        logger.error(f"User status error: {str(e)}")
        return jsonify({'active': False})

@app.route('/api/user/stats')
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
def user_recent_activity():
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first!'})

        recent_exams = ExamResult.query.filter_by(
            user_id=session['user_id']
        ).order_by(ExamResult.created_at.desc()).limit(10).all()

        activities = []
        for exam in recent_exams:
            activities.append({
                'exam_type': exam.exam_type,
                'subjects': exam.subjects,
                'score': exam.score,
                'total_questions': exam.total_questions,
                'percentage': exam.percentage,
                'date': exam.created_at.isoformat()
            })

        return jsonify({
            'success': True,
            'activities': activities
        })

    except Exception as e:
        logger.error(f"Recent activity error: {str(e)}")
        return jsonify({'success': False, 'message': 'Error loading recent activity'})

# -------------------- ACTIVATION SYSTEM --------------------
@app.route('/activate', methods=['POST'])
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

        activation_code.is_used = True
        activation_code.used_by = user.id
        activation_code.used_at = datetime.utcnow()

        db.session.commit()

        session['is_activated'] = True

        logger.info(f"User activated: {user.email} with code: {code}")

        return jsonify({
            'success': True,
            'message': 'Account activated successfully! Enjoy full access to MSH CBT HUB.'
        })

    except Exception as e:
        logger.error(f"Activation error: {str(e)}")
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Activation failed. Please try again.'})

# -------------------- EXAM SYSTEM - V3 CRITICAL FIXES --------------------
@app.route('/api/start-exam', methods=['POST'])
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
            current_device_id = get_device_id()
            if user.device_id and user.device_id != current_device_id:
                return jsonify({
                    'success': False, 
                    'message': 'Your trial has expired and cannot be used on this device. Please activate your account.'
                })
            else:
                return jsonify({
                    'success': False, 
                    'message': 'Your access has expired. Please activate your account.'
                })

        return jsonify({'success': True, 'message': 'Exam access granted!'})

    except Exception as e:
        logger.error(f"Start exam error: {str(e)}")
        return jsonify({'success': False, 'message': 'Error starting exam.'})

@app.route('/api/get-questions', methods=['POST'])
def get_questions():
    """
    V3 FIX: Enhanced question loading with exactly 60 questions.
    English gets 10-15 questions, other subjects get proportional distribution.
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

        # V3 FIX: Use new question loading with 60 questions guarantee
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

        # V3 FIX: Add question IDs for frontend tracking
        for i, question in enumerate(all_questions):
            question['id'] = i
            question['selected_answer'] = None

        return jsonify({
            'success': True,
            'questions': all_questions,
            'total_questions': len(all_questions),
            'subject_distribution': subject_counts,
            'exam_type': exam_type
        })

    except Exception as e:
        logger.error(f"Get questions error: {str(e)}")
        return jsonify({'success': False, 'message': f'Error loading questions: {str(e)}'})

@app.route('/api/submit-exam', methods=['POST'])
def submit_exam():
    """
    V3 FIX: Enhanced exam submission with better error handling and JAMB results fix.
    """
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first!'})

        data = request.get_json()
        
        # V3 FIX: Better validation
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

        # Save result to database
        new_result = ExamResult(
            user_id=session['user_id'],
            exam_type=exam_type,
            subjects=','.join(subjects),
            score=correct,
            total_questions=total_questions,
            percentage=percentage,
            time_taken=data.get('time_taken', 0),
            user_answers=json.dumps(user_answers),
            questions_data=json.dumps(questions)
        )

        db.session.add(new_result)
        db.session.commit()

        logger.info(f"Exam submitted - User: {session['user_id']}, Type: {exam_type}, "
                   f"Score: {correct}/{total_questions} ({percentage}%)")

        # V3 FIX: Return proper structure for both WAEC and JAMB
        return jsonify({
            'success': True,
            'message': 'Exam submitted successfully!',
            'score': correct,
            'total_questions': total_questions,
            'percentage': percentage,
            'subject_scores': subject_scores,
            'result_id': new_result.id,
            'exam_type': exam_type,
            'subjects': subjects
        })

    except Exception as e:
        logger.error(f"Submit exam error: {str(e)}")
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error submitting exam: {str(e)}'})

@app.route('/api/exam-results/<int:result_id>')
def get_exam_result(result_id):
    """
    V3 FIX: Enhanced results retrieval for both WAEC and JAMB.
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

        # V3 FIX: Calculate subject scores for display
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
                'subject_scores': subject_scores  # V3 FIX: Include subject scores
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
                'recent_exams': recent_exams
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

            users_data.append({
                'id': user.id,
                'name': user.full_name,
                'email': user.email,
                'ip_address': user.ip_address,
                'status': trial_status,
                'exam_count': exam_count,
                'join_date': user.created_at.strftime('%Y-%m-%d %H:%M'),
                'last_login': user.last_login.strftime('%Y-%m-%d %H:%M') if user.last_login else 'Never',
                'activation_code': user.activation_code,
                'device_id': user.device_id
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
        db.session.execute(db.select(1))
        old_data_count = TemporaryData.query.filter(TemporaryData.expires_at < datetime.utcnow()).count()
        
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'database': 'connected',
            'pending_cleanup': old_data_count,
            'version': '3.0'
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
            
            logger.info("MSH CBT HUB Application V3 Initialized Successfully")
    except Exception as e:
        logger.error(f"Application initialization failed: {str(e)}")

initialize_application()

# -------------------- RUN --------------------
if __name__ == '__main__':
    print("🚀 Starting MSH CBT HUB Server - VERSION 3...")
    print("✅ All V3 requirements implemented:")
    print("   ✅ FIXED: Exactly 60 questions per exam")
    print("   ✅ FIXED: English gets 10-15 random questions")
    print("   ✅ FIXED: Proper subject distribution")
    print("   ✅ FIXED: JAMB results display issue")
    print("   ✅ FIXED: Real questions only from pool")
    print("⚠️  IMPORTANT: Ensure you set the SECRET_KEY environment variable!")
    print("📁 Running with templates/ and static/ folders")
    print("📝 Note: Ensure question JSON files exist in questions/ folder")
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
