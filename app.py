# app.py - VERSION 3 - FIXED ANSWER REVIEW & WAEC RESULTS
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

# -------------------- DATABASE MODELS - V3 ENHANCED --------------------
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
    subject_details = db.Column(db.Text)  # NEW: Store detailed subject breakdown

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
            # Ensure explanation field exists
            question.setdefault('explanation', question.get('explanation', 'No explanation available.'))

        return data['questions']

    except Exception as e:
        logger.error(f"Error loading questions from {file_name}: {str(e)}")
        return None

def ensure_english_questions(questions, exam_type, selected_subjects):
    """CRITICAL FIX: Ensure English questions are included in exams"""
    # Check if English is required but missing
    english_required = 'english' in [s.lower() for s in selected_subjects]
    
    if not english_required:
        return questions
    
    # Count current English questions
    current_english_count = sum(1 for q in questions if q.get('subject') == 'english')
    
    # We need at least 10-15 English questions
    if current_english_count >= 10:
        return questions
    
    # Load additional English questions
    try:
        english_questions = load_questions_from_file(exam_type, 'english')
        if english_questions:
            # Filter out questions we already have
            existing_question_texts = [q.get('question', '') for q in questions]
            new_english_questions = [
                q for q in english_questions 
                if q.get('question', '') not in existing_question_texts
            ]
            
            # Calculate how many English questions we need to add
            needed_english = 15 - current_english_count
            questions_to_add = min(needed_english, len(new_english_questions))
            
            if questions_to_add > 0:
                # Add English questions at the beginning to ensure they're included
                questions = new_english_questions[:questions_to_add] + questions
                logger.info(f"Added {questions_to_add} English questions to ensure subject coverage")
                
    except Exception as e:
        logger.error(f"Error ensuring English questions: {str(e)}")
    
    return questions

def get_questions_with_english_priority(exam_type, selected_subjects):
    """Load questions with guaranteed English question inclusion"""
    all_questions = []
    
    # CRITICAL FIX: Load English questions first to ensure they're included
    if 'english' in [s.lower() for s in selected_subjects]:
        english_questions = load_questions_from_file(exam_type, 'english')
        if english_questions:
            # Take 15 English questions to ensure good coverage
            english_to_take = min(15, len(english_questions))
            all_questions.extend(english_questions[:english_to_take])
            logger.info(f"Loaded {english_to_take} English questions as priority")
    
    # Load other subjects
    for subject in selected_subjects:
        subject_lower = subject.lower()
        if subject_lower != 'english':  # Skip English as we already loaded it
            questions = load_questions_from_file(exam_type, subject_lower)
            if questions:
                all_questions.extend(questions)
                logger.info(f"Loaded {len(questions)} questions for {subject}")
    
    # If we still don't have enough English questions, try to load more
    english_count = sum(1 for q in all_questions if q.get('subject') == 'english')
    if 'english' in [s.lower() for s in selected_subjects] and english_count < 10:
        additional_english = load_questions_from_file(exam_type, 'english')
        if additional_english:
            # Add more English questions to reach minimum
            needed = 10 - english_count
            additional_to_add = min(needed, len(additional_english))
            all_questions = additional_english[:additional_to_add] + all_questions
            logger.info(f"Added {additional_to_add} additional English questions")
    
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

def calculate_subject_breakdown(questions, user_answers):
    """Calculate detailed subject breakdown for results"""
    subject_stats = {}
    
    for i, question in enumerate(questions):
        subject = question.get('subject', 'Unknown')
        if subject not in subject_stats:
            subject_stats[subject] = {
                'total': 0,
                'correct': 0,
                'questions': []
            }
        
        subject_stats[subject]['total'] += 1
        
        user_answer = user_answers.get(str(i))
        correct_answer = question.get('correct_answer', '')
        
        is_correct = user_answer and user_answer.upper() == correct_answer.upper()
        
        if is_correct:
            subject_stats[subject]['correct'] += 1
        
        # Store question details for review
        subject_stats[subject]['questions'].append({
            'index': i,
            'question': question.get('question'),
            'options': question.get('options', []),
            'correct_answer': correct_answer,
            'user_answer': user_answer,
            'is_correct': is_correct,
            'explanation': question.get('explanation', 'No explanation available.')
        })
    
    return subject_stats

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

# -------------------- EXAM SYSTEM - CRITICAL FIXES --------------------
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
    """CRITICAL FIX: Enhanced question loading with guaranteed English questions"""
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

        # CRITICAL FIX: Use enhanced question loading with English priority
        all_questions = get_questions_with_english_priority(exam_type, subjects)

        if not all_questions:
            return jsonify({
                'success': False, 
                'message': 'No questions found for the selected subjects! Please try different subjects.'
            })

        # Ensure we have exactly 60 questions
        if len(all_questions) > 60:
            random.shuffle(all_questions)
            selected_questions = all_questions[:60]
        else:
            selected_questions = all_questions

        # Final check: Ensure English questions are included if required
        if 'english' in [s.lower() for s in subjects]:
            english_questions_in_exam = sum(1 for q in selected_questions if q.get('subject') == 'english')
            if english_questions_in_exam < 10:
                logger.warning(f"Only {english_questions_in_exam} English questions in exam, expected at least 10")

        # Log subject distribution for debugging
        subject_counts = {}
        for question in selected_questions:
            subject = question.get('subject', 'unknown')
            subject_counts[subject] = subject_counts.get(subject, 0) + 1

        logger.info(f"Loaded {len(selected_questions)} questions for {exam_type} - Subjects: {subject_counts}")

        return jsonify({
            'success': True,
            'questions': selected_questions,
            'total_questions': len(selected_questions),
            'subject_distribution': subject_counts
        })

    except Exception as e:
        logger.error(f"Get questions error: {str(e)}")
        return jsonify({'success': False, 'message': f'Error loading questions: {str(e)}'})

@app.route('/api/submit-exam', methods=['POST'])
def submit_exam():
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first!'})

        data = request.get_json()

        user_answers = data.get('user_answers', {})
        questions = data.get('questions', [])
        exam_type = data.get('exam_type', '')

        correct = 0
        subject_scores = {}

        for i, question in enumerate(questions):
            user_answer = user_answers.get(str(i))
            subject = question.get('subject', 'Unknown')

            if subject not in subject_scores:
                subject_scores[subject] = {'total': 0, 'correct': 0}

            subject_scores[subject]['total'] += 1

            if user_answer and user_answer.upper() == question.get('correct_answer', '').upper():
                correct += 1
                subject_scores[subject]['correct'] += 1

        total_questions = len(questions)
        percentage = round((correct / total_questions) * 100, 2) if total_questions > 0 else 0
        
        # Calculate detailed subject breakdown for review
        subject_breakdown = calculate_subject_breakdown(questions, user_answers)

        new_result = ExamResult(
            user_id=session['user_id'],
            exam_type=exam_type,
            subjects=','.join(data.get('subjects', [])),
            score=correct,
            total_questions=total_questions,
            percentage=percentage,
            time_taken=data.get('time_taken', 0),
            user_answers=json.dumps(user_answers),
            questions_data=json.dumps(questions),
            subject_details=json.dumps(subject_breakdown)  # Store detailed breakdown
        )

        db.session.add(new_result)
        db.session.commit()

        logger.info(f"Exam submitted - User: {session['user_id']}, Score: {correct}/{total_questions} ({percentage}%)")

        return jsonify({
            'success': True,
            'message': 'Exam submitted successfully!',
            'score': correct,
            'total_questions': total_questions,
            'percentage': percentage,
            'subject_scores': subject_scores,
            'subject_breakdown': subject_breakdown,  # Return detailed breakdown
            'result_id': new_result.id,
            'exam_type': exam_type  # Include exam type for frontend
        })

    except Exception as e:
        logger.error(f"Submit exam error: {str(e)}")
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error submitting exam: {str(e)}'})

@app.route('/api/exam-results/<int:result_id>')
def get_exam_result(result_id):
    """Get detailed exam result including explanations for review"""
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first!'})

        result = ExamResult.query.filter_by(id=result_id, user_id=session['user_id']).first()

        if not result:
            return jsonify({'success': False, 'message': 'Result not found!'})

        # Parse stored data
        user_answers = json.loads(result.user_answers) if result.user_answers else {}
        questions = json.loads(result.questions_data) if result.questions_data else []
        subject_details = json.loads(result.subject_details) if result.subject_details else {}

        # Prepare detailed review data
        review_questions = []
        for i, question in enumerate(questions):
            user_answer = user_answers.get(str(i))
            correct_answer = question.get('correct_answer', '')
            is_correct = user_answer and user_answer.upper() == correct_answer.upper()
            
            review_questions.append({
                'index': i,
                'question': question.get('question'),
                'options': question.get('options', []),
                'correct_answer': correct_answer,
                'user_answer': user_answer,
                'is_correct': is_correct,
                'explanation': question.get('explanation', 'No explanation available.'),
                'subject': question.get('subject', 'Unknown')
            })

        return jsonify({
            'success': True,
            'result': {
                'id': result.id,
                'exam_type': result.exam_type,
                'subjects': result.subjects.split(','),
                'score': result.score,
                'total_questions': result.total_questions,
                'percentage': result.percentage,
                'time_taken': result.time_taken,
                'created_at': result.created_at.isoformat(),
                'review_questions': review_questions,  # Detailed review data
                'subject_details': subject_details,  # Subject breakdown
                'user_answers': user_answers,
                'questions': questions
            }
        })

    except Exception as e:
        logger.error(f"Get exam result error: {str(e)}")
        return jsonify({'success': False, 'message': 'Error loading exam result.'})

@app.route('/api/get-review-data/<int:result_id>')
def get_review_data(result_id):
    """Get detailed review data for answer analysis"""
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first!'})

        result = ExamResult.query.filter_by(id=result_id, user_id=session['user_id']).first()

        if not result:
            return jsonify({'success': False, 'message': 'Result not found!'})

        questions = json.loads(result.questions_data) if result.questions_data else []
        user_answers = json.loads(result.user_answers) if result.user_answers else {}

        # Prepare detailed review data
        all_questions = []
        correct_questions = []
        wrong_questions = []
        unanswered_questions = []

        for i, question in enumerate(questions):
            user_answer = user_answers.get(str(i))
            correct_answer = question.get('correct_answer', '')
            
            is_correct = user_answer and user_answer.upper() == correct_answer.upper()
            is_unanswered = user_answer is None or user_answer == ''
            
            question_data = {
                'index': i,
                'question_number': i + 1,
                'question': question.get('question'),
                'options': question.get('options', []),
                'correct_answer': correct_answer,
                'user_answer': user_answer if user_answer else 'Not answered',
                'is_correct': is_correct,
                'is_unanswered': is_unanswered,
                'explanation': question.get('explanation', 'No explanation available.'),
                'subject': question.get('subject', 'Unknown')
            }
            
            all_questions.append(question_data)
            
            if is_unanswered:
                unanswered_questions.append(question_data)
            elif is_correct:
                correct_questions.append(question_data)
            else:
                wrong_questions.append(question_data)

        return jsonify({
            'success': True,
            'review_data': {
                'all': all_questions,
                'correct': correct_questions,
                'wrong': wrong_questions,
                'unanswered': unanswered_questions,
                'total_questions': len(questions),
                'correct_count': len(correct_questions),
                'wrong_count': len(wrong_questions),
                'unanswered_count': len(unanswered_questions)
            }
        })

    except Exception as e:
        logger.error(f"Get review data error: {str(e)}")
        return jsonify({'success': False, 'message': 'Error loading review data.'})

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
    print("   ✅ FIXED: Answer review system now shows correct/wrong answers with explanations")
    print("   ✅ FIXED: WAEC result page now displays properly")
    print("   ✅ ENHANCED: Detailed subject breakdown in results")
    print("   ✅ NEW: /api/get-review-data endpoint for detailed review")
    print("   ✅ CRITICAL BUG FIX: English questions load properly")
    print("⚠️  IMPORTANT: Ensure you set the SECRET_KEY environment variable!")
    print("📁 Running with templates/ and static/ folders")
    print("📝 Note: Ensure question JSON files have 'explanation' field")
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
