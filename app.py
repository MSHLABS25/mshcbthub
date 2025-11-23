# app.py - VERSION 2 - UPDATED WITH ENGLISH TEST FIXES & ENHANCEMENTS
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
from sqlalchemy import func, or_
from functools import wraps

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

# -------------------- DATABASE MODELS --------------------
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

    # Relationship with exam results
    exam_results = db.relationship('ExamResult', backref='user', lazy=True)

class ActivationCode(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True, nullable=False)
    is_used = db.Column(db.Boolean, default=False)
    used_by = db.Column(db.Integer, db.ForeignKey('user.id'))
    used_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime)

    # Relationship to the user who used the code (nullable)
    used_user = db.relationship('User', foreign_keys=[used_by], backref='used_activation_codes')

class ExamResult(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    exam_type = db.Column(db.String(10), nullable=False)  # 'WAEC' or 'JAMB'
    subjects = db.Column(db.String(500), nullable=False)
    score = db.Column(db.Integer, nullable=False)
    total_questions = db.Column(db.Integer, nullable=False)
    percentage = db.Column(db.Float, nullable=False)
    time_taken = db.Column(db.Integer)  # in seconds
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Detailed results storage
    user_answers = db.Column(db.Text)  # JSON string of user answers
    questions_data = db.Column(db.Text)  # JSON string of questions

# Ensure tables exist
with app.app_context():
    try:
        db.create_all()
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {str(e)}")

# -------------------- HELPERS --------------------
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
    if user.trial_start:
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
        else:
            avg_score = 0

        return {
            'total_exams': total_exams,
            'average_score': avg_score
        }
    except Exception as e:
        logger.error(f"Error getting user stats: {str(e)}")
        return {'total_exams': 0, 'average_score': 0}

def load_questions_from_file(exam_type, subject):
    """Load questions from JSON files in questions/ folder with error handling"""
    try:
        # Normalize exam_type and subject to file name format
        exam_part = str(exam_type).strip().lower()
        subject_part = str(subject).strip().lower().replace(' ', '_')

        file_name = f"{exam_part}_{subject_part}.json"
        file_path = os.path.join(app.root_path, 'questions', file_name)

        # FIX: Check for English language variations
        if not os.path.exists(file_path) and subject_part == 'english':
            # Try alternative file names for English
            alternative_files = [
                f"{exam_part}_english_language.json",
                f"{exam_part}_english.json",
                "waec_english.json",
                "jamb_english.json"
            ]
            
            for alt_file in alternative_files:
                alt_path = os.path.join(app.root_path, 'questions', alt_file)
                if os.path.exists(alt_path):
                    file_path = alt_path
                    file_name = alt_file
                    logger.info(f"Using alternative English file: {alt_file}")
                    break

        if not os.path.exists(file_path):
            logger.warning(f"Question file not found: {file_path}")
            # Try to find any English file as fallback
            if 'english' in subject_part:
                english_files = [f for f in os.listdir(os.path.join(app.root_path, 'questions')) 
                               if 'english' in f.lower() and f.endswith('.json')]
                if english_files:
                    file_path = os.path.join(app.root_path, 'questions', english_files[0])
                    logger.info(f"Using fallback English file: {english_files[0]}")
                else:
                    return None
            else:
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

def validate_subject_selection(exam_type, subjects):
    """Validate subject selection based on exam type"""
    subjects_lower = [s.lower() for s in subjects]
    
    if exam_type.upper() == 'WAEC':
        if len(subjects) != 9:
            return False, 'WAEC requires exactly 9 subjects'
        if 'english' not in subjects_lower:
            return False, 'WAEC requires English Language'
        if 'mathematics' not in subjects_lower:
            return False, 'WAEC requires Mathematics'
        return True, 'Valid selection'
    
    elif exam_type.upper() == 'JAMB':
        if len(subjects) != 4:
            return False, 'JAMB requires exactly 4 subjects'
        if 'english' not in subjects_lower:
            return False, 'JAMB requires English Language'
        return True, 'Valid selection'
    
    return False, 'Invalid exam type'

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
    """Serve the dashboard page - handled by frontend routing"""
    try:
        return render_template('index.html')
    except Exception as e:
        logger.error(f"Error serving dashboard: {str(e)}")
        return redirect(url_for('index'))

@app.route('/admin')
def admin():
    # Serve admin page (frontend should handle admin auth)
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

        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({'success': False, 'message': 'Email already registered!'})

        hashed_password = generate_password_hash(password)

        # First registered user becomes admin
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
            is_admin=is_admin
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
            # Check trial status - FIXED: Allow login during trial period
            trial_active = check_trial_status(user)
            
            if not trial_active and not user.is_activated:
                return jsonify({
                    'success': False,
                    'message': 'Your trial has expired. Please activate your account to continue.'
                })

            user.last_login = datetime.utcnow()
            db.session.commit()

            session['user_id'] = user.id
            session['user_name'] = user.full_name
            session['user_email'] = user.email
            session['is_activated'] = user.is_activated
            session['is_admin'] = user.is_admin
            session.permanent = True

            logger.info(f"User logged in: {email} (Admin: {user.is_admin})")

            response_data = {
                'success': True,
                'message': 'Login successful! Welcome back.',
                'user_name': user.full_name,
                'is_activated': user.is_activated,
                'is_admin': user.is_admin
            }

            # Add trial information if in trial period
            if trial_active and not user.is_activated:
                trial_end = user.trial_start + timedelta(hours=1)
                remaining = trial_end - datetime.utcnow()
                remaining_minutes = max(0, int(remaining.total_seconds() / 60))
                response_data['trial_active'] = True
                response_data['remaining_minutes'] = remaining_minutes

            return jsonify(response_data)

        return jsonify({'success': False, 'message': 'Invalid email or password!'})

    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({'success': False, 'message': 'Login failed. Please try again.'})

@app.route('/logout')
def logout():
    try:
        user_name = session.get('user_name', 'User')
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

        # Check trial status
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
            
            return jsonify({
                'active': True,
                'status': 'trial',
                'user_name': user.full_name,
                'user_email': user.email,
                'remaining_minutes': remaining_minutes,
                'is_admin': user.is_admin
            })

        # Trial expired and not activated
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

# -------------------- ENHANCED EXAM SYSTEM --------------------
@app.route('/api/start-exam', methods=['POST'])
def start_exam():
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first!'})

        user = User.query.get(session['user_id'])
        if not user:
            session.clear()
            return jsonify({'success': False, 'message': 'Session expired. Please login again.'})

        # Check trial/activation status - FIXED: Allow during trial period
        trial_active = check_trial_status(user)
        if not trial_active and not user.is_activated:
            return jsonify({'success': False, 'message': 'Your access has expired. Please activate your account.'})

        return jsonify({'success': True, 'message': 'Exam access granted!'})

    except Exception as e:
        logger.error(f"Start exam error: {str(e)}")
        return jsonify({'success': False, 'message': 'Error starting exam.'})

@app.route('/api/get-questions', methods=['POST'])
def get_questions():
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first!'})

        data = request.get_json()
        exam_type = data.get('exam_type')
        subjects = data.get('subjects', [])

        if not exam_type or not subjects:
            return jsonify({'success': False, 'message': 'Exam type and subjects are required!'})

        # Validate subject selection
        is_valid, validation_message = validate_subject_selection(exam_type, subjects)
        if not is_valid:
            return jsonify({'success': False, 'message': validation_message})

        all_questions = []

        for subject in subjects:
            questions = load_questions_from_file(exam_type, subject)
            if questions:
                all_questions.extend(questions)
                logger.info(f"Loaded {len(questions)} questions for {exam_type} {subject}")
            else:
                logger.warning(f"Questions not found for {exam_type} {subject}")
                # Continue with other subjects but log the issue

        if not all_questions:
            return jsonify({'success': False, 'message': 'No questions found for the selected subjects!'})

        # Shuffle questions and select appropriate number
        random.shuffle(all_questions)
        
        # Determine number of questions based on exam type
        if exam_type.upper() == 'WAEC':
            question_limit = 60  # WAEC typically has more questions
        else:
            question_limit = 50  # JAMB typically has fewer questions
            
        selected_questions = all_questions[:question_limit]

        logger.info(f"Loaded {len(selected_questions)} questions for {exam_type} - {subjects}")

        return jsonify({
            'success': True,
            'questions': selected_questions,
            'total_questions': len(selected_questions)
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
        exam_type = data.get('exam_type')
        selected_subjects = data.get('subjects', [])

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

        new_result = ExamResult(
            user_id=session['user_id'],
            exam_type=exam_type,
            subjects=','.join(selected_subjects),
            score=correct,
            total_questions=total_questions,
            percentage=percentage,
            time_taken=data.get('time_taken', 0),
            user_answers=json.dumps(user_answers),
            questions_data=json.dumps(questions)
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
            'result_id': new_result.id
        })

    except Exception as e:
        logger.error(f"Submit exam error: {str(e)}")
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error submitting exam: {str(e)}'})

@app.route('/api/exam-results/<int:result_id>')
def get_exam_result(result_id):
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Please login first!'})

        result = ExamResult.query.filter_by(id=result_id, user_id=session['user_id']).first()

        if not result:
            return jsonify({'success': False, 'message': 'Result not found!'})

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
                'user_answers': json.loads(result.user_answers) if result.user_answers else {},
                'questions': json.loads(result.questions_data) if result.questions_data else []
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
        data = request.get_json()
        count = data.get('count', 100)  # Allow custom count, default to 100
        
        if count > 1000:  # Safety limit
            return jsonify({'success': False, 'message': 'Cannot generate more than 1000 codes at once'})

        codes = []
        for _ in range(count):
            code = generate_activation_code()
            expires_at = datetime.utcnow() + timedelta(days=150)  # 5 months

            while ActivationCode.query.filter_by(code=code).first():
                code = generate_activation_code()

            activation_code = ActivationCode(
                code=code,
                expires_at=expires_at
            )
            db.session.add(activation_code)
            codes.append(code)

        db.session.commit()

        logger.info(f"Generated {count} activation codes by Admin: {session.get('user_email')}")

        return jsonify({
            'success': True,
            'message': f'{count} activation codes generated successfully with enhanced format MSH-XXXX-XXXX!',
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

        # Calculate active trials (users with trial not expired and not activated)
        active_trials = 0
        for user in User.query.filter_by(is_activated=False).all():
            if check_trial_status(user):
                active_trials += 1

        return jsonify({
            'success': True,
            'stats': {
                'total_users': total_users,
                'activated_users': activated_users,
                'active_trials': active_trials,
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
            # Determine user status
            if user.is_admin:
                status = 'Admin'
            elif user.is_activated:
                status = 'Activated'
            elif check_trial_status(user):
                status = 'Trial'
            else:
                status = 'Expired'

            users_data.append({
                'id': user.id,
                'name': user.full_name,
                'email': user.email,
                'ip_address': user.ip_address,
                'status': status,
                'exam_count': exam_count,
                'join_date': user.created_at.strftime('%Y-%m-%d %H:%M'),
                'last_login': user.last_login.strftime('%Y-%m-%d %H:%M') if user.last_login else 'Never',
                'activation_code': user.activation_code
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

# -------------------- QUESTION MANAGEMENT --------------------
@app.route('/api/subjects')
def get_available_subjects():
    """Get list of available subjects with question counts"""
    try:
        subjects_data = {}
        questions_dir = os.path.join(app.root_path, 'questions')
        
        if os.path.exists(questions_dir):
            for filename in os.listdir(questions_dir):
                if filename.endswith('.json'):
                    # Extract subject name from filename
                    subject_name = filename.replace('.json', '').replace('waec_', '').replace('jamb_', '')
                    subject_name = subject_name.replace('_', ' ').title()
                    
                    file_path = os.path.join(questions_dir, filename)
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                            question_count = len(data.get('questions', []))
                            subjects_data[subject_name] = question_count
                    except Exception as e:
                        logger.error(f"Error reading {filename}: {str(e)}")
                        continue
        
        return jsonify({
            'success': True,
            'subjects': subjects_data
        })
        
    except Exception as e:
        logger.error(f"Error getting subjects: {str(e)}")
        return jsonify({'success': False, 'message': 'Error loading subjects'})

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
        # test simple DB connection
        db.session.execute(db.select(1))
        
        # Check questions directory
        questions_dir = os.path.join(app.root_path, 'questions')
        questions_exist = os.path.exists(questions_dir)
        question_files = []
        
        if questions_exist:
            question_files = [f for f in os.listdir(questions_dir) if f.endswith('.json')]
        
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'database': 'connected',
            'questions_available': len(question_files),
            'question_files': question_files
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
            # Create initial admin activation codes if none exist
            if ActivationCode.query.count() == 0:
                logger.info("Creating initial activation codes...")
                for _ in range(10):
                    code = generate_activation_code()
                    expires_at = datetime.utcnow() + timedelta(days=150)
                    activation_code = ActivationCode(code=code, expires_at=expires_at)
                    db.session.add(activation_code)
                db.session.commit()
                logger.info("Initial activation codes created")
            
            # Log available question files
            questions_dir = os.path.join(app.root_path, 'questions')
            if os.path.exists(questions_dir):
                question_files = [f for f in os.listdir(questions_dir) if f.endswith('.json')]
                logger.info(f"Found {len(question_files)} question files: {question_files}")
            else:
                logger.warning("Questions directory not found!")
                
            logger.info("MSH CBT HUB Application Initialized Successfully - V2 with English Test Fixes")
    except Exception as e:
        logger.error(f"Application initialization failed: {str(e)}")

initialize_application()

# -------------------- RUN --------------------
if __name__ == '__main__':
    print("🚀 Starting MSH CBT HUB Server - VERSION 2...")
    print("✅ English WAEC & JAMB tests FIXED")
    print("✅ Enhanced question loading with fallbacks")
    print("✅ Improved subject validation")
    print("✅ Better error handling and logging")
    print("⚠️  IMPORTANT: Ensure you set the SECRET_KEY environment variable!")
    print("📁 Running with templates/ and static/ folders")
    print("📝 Note: Ensure question JSON files exist in questions/ folder")
    
    # Check for required directories
    questions_dir = os.path.join(app.root_path, 'questions')
    if not os.path.exists(questions_dir):
        print("❌ WARNING: questions/ directory not found!")
        print("   Please create a 'questions' folder with JSON question files")
    else:
        question_files = [f for f in os.listdir(questions_dir) if f.endswith('.json')]
        print(f"✅ Found {len(question_files)} question files")
        
        # Check for English question files
        english_files = [f for f in question_files if 'english' in f.lower()]
        if english_files:
            print(f"✅ English question files found: {english_files}")
        else:
            print("❌ WARNING: No English question files found!")
    
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
