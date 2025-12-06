# app.py - VERSION 2 - UPDATED WITH CRITICAL ENGLISH QUESTION FIX
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

    used_user = db.relationship('User', foreign_keys=[used_by])

class ExamResult(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    exam_type = db.Column(db.String(10), nullable=False) # e.g., 'JAMB', 'WAEC'
    score = db.Column(db.Integer, nullable=False)
    total_questions = db.Column(db.Integer, nullable=False)
    percentage = db.Column(db.Float, nullable=False)
    subjects = db.Column(db.String(255), nullable=False) # Comma separated list of subjects
    duration_seconds = db.Column(db.Integer)
    taken_at = db.Column(db.DateTime, default=datetime.utcnow)
    questions_data = db.Column(db.Text) # JSON string of questions and user answers for review

class TemporaryData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(100), index=True)
    key = db.Column(db.String(100), index=True)
    value = db.Column(db.Text)
    expires_at = db.Column(db.DateTime, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class UserSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    session_id = db.Column(db.String(100), unique=True, nullable=False)
    login_time = db.Column(db.DateTime, default=datetime.utcnow)
    last_activity = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    ip_address = db.Column(db.String(50))
    is_active = db.Column(db.Boolean, default=True)

    def is_expired(self):
        # 1 hour of inactivity
        return datetime.utcnow() - self.last_activity > timedelta(hours=1)

# -------------------- DATABASE UTILITIES --------------------
def clean_expired_data():
    """Cleans up expired temporary data and inactive sessions."""
    try:
        # 1. Clean up TemporaryData
        expired_data = TemporaryData.query.filter(TemporaryData.expires_at < datetime.utcnow()).delete()
        
        # 2. Clean up Inactive UserSessions (e.g., sessions inactive for over 1 hour)
        inactive_cutoff = datetime.utcnow() - timedelta(hours=1)
        inactive_sessions = UserSession.query.filter(
            UserSession.is_active == True,
            UserSession.last_activity < inactive_cutoff
        ).update({UserSession.is_active: False}, synchronize_session=False)

        if expired_data > 0 or inactive_sessions > 0:
            db.session.commit()
            logger.info(f"Cleaned up {expired_data} expired temporary data records and marked {inactive_sessions} sessions as inactive.")
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

# -------------------- AUTH & DECORATORS --------------------
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            # For API routes, return JSON error
            if request.path.startswith('/api'):
                return jsonify({'success': False, 'message': 'Authentication required.'}), 401
            # For page routes, redirect to home
            return redirect(url_for('index', next=request.url))
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    @login_required
    def decorated_function(*args, **kwargs):
        user = User.query.get(session['user_id'])
        if not user or not user.is_admin:
            if request.path.startswith('/api'):
                return jsonify({'success': False, 'message': 'Admin privilege required.'}), 403
            return redirect(url_for('index'))
        return f(*args, **kwargs)
    return decorated_function

# -------------------- QUESTION LOADING & SELECTION --------------------
def load_questions_data(exam_type, subject):
    """Loads question data from the specified JSON file."""
    # This path is for all subjects EXCEPT English, assuming they might be in a 'questions' folder
    # but since the user uploaded all files flat, we adjust the default path here to the root folder
    filename = f"{exam_type.lower()}_{subject.lower()}.json"
    filepath = os.path.join(app.root_path, filename)
    
    # Check if a specific questions/ folder exists on the hosted server and use it if files are there
    if not os.path.exists(filepath) and os.path.isdir(os.path.join(app.root_path, 'questions')):
        filepath = os.path.join(app.root_path, 'questions', filename)

    if not os.path.exists(filepath):
        logger.warning(f"Question file not found: {filepath}")
        return None

    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
            return data.get('questions', [])
    except Exception as e:
        logger.error(f"Error loading questions from {filepath}: {str(e)}")
        return None

def prepare_questions(exam_type, selected_subjects, num_questions=40):
    """
    Selects and shuffles questions from all selected subjects.
    Prioritizes English to ensure it is always selected first and correctly.
    """
    questions = []
    subject_map = {s.lower(): s for s in selected_subjects}

    # --- 1. Load non-English subjects first ---
    # The list of ALL possible subjects excluding English
    non_english_subjects = [s for s in selected_subjects if s.lower() != 'english']
    
    for subject in non_english_subjects:
        subject_lower = subject.lower()
        subject_questions = load_questions_data(exam_type, subject_lower)
        
        if subject_questions:
            # Determine the number of questions to select for this subject
            # JAMB usually has 40, WAEC can be 50-60. We use num_questions // total_subjects as a guide.
            # Since JAMB is 4 subjects, non-English get 30 each (120 total)
            # WAEC is 9 subjects, they might get ~10-15 each.
            
            # Simple Selection Strategy for non-English subjects:
            # For JAMB (4 subs total), 3 subs get 30 each = 90. English gets 100. (Total 190)
            # For WAEC (9 subs total), 8 subs get 15 each = 120. English gets 50. (Total 170)
            
            if exam_type.upper() == 'JAMB':
                target_count = 30
            else: # WAEC
                target_count = 15 
                
            # Randomly select the target_count questions
            selected = random.sample(subject_questions, min(target_count, len(subject_questions)))
            
            # Add subject property for front-end grouping
            for q in selected:
                q['subject'] = subject_lower.capitalize()
            
            questions.extend(selected)
            logger.info(f"Loaded {len(selected)} questions for {subject_lower.capitalize()}")

    # --- 2. Special handling for English to guarantee it loads ---
    english_required = 'english' in [s.lower() for s in selected_subjects]
    if not english_required:
        random.shuffle(questions)
        return questions

    # Count current English questions loaded (should be 0 unless English was mistakenly loaded above)
    current_english_count = sum(1 for q in questions if q.get('subject') == 'English')
    
    # If English was somehow already loaded, skip the special load
    if current_english_count >= 10: 
        logger.info(f"Sufficient English questions already loaded: {current_english_count}")
        random.shuffle(questions)
        return questions

    # Load English data separately (CRITICAL BUG FIX: PATH CORRECTION HERE)
    english_filename = f"{exam_type.lower()}_english.json"
    
    # FIX: Correct the path to look in the root directory (where the user placed the files)
    english_filepath = os.path.join(app.root_path, english_filename)
    
    # Secondary check: If the file is still not found, check the 'questions' folder as a fallback
    if not os.path.exists(english_filepath) and os.path.isdir(os.path.join(app.root_path, 'questions')):
        english_filepath = os.path.join(app.root_path, 'questions', english_filename)

    try:
        with open(english_filepath, 'r') as f:
            english_data = json.load(f)
            all_english_questions = english_data.get('questions', [])
            
            # Selection Strategy for English
            if exam_type.upper() == 'JAMB':
                target_count = 100 # JAMB English usually has 100 questions
            else: # WAEC
                target_count = 50 # WAEC English usually has ~50 questions (50th question is usually the last comprehension)
            
            selected_english = random.sample(all_english_questions, min(target_count, len(all_english_questions)))
            
            for q in selected_english:
                q['subject'] = 'English'
            
            questions.extend(selected_english)
            logger.info(f"Loaded {len(selected_english)} questions for English")
            
    except FileNotFoundError:
        logger.error(f"CRITICAL: English question file not found at expected path: {english_filepath}")
    except Exception as e:
        logger.error(f"Error loading English questions: {str(e)}")

    # 3. Final Shuffling
    random.shuffle(questions)
    return questions

# ... (The rest of your app.py code continues here without changes)
# The full file is generated below this line.

# -------------------- HELPER FUNCTIONS --------------------
def generate_activation_code(length=12):
    """Generates a random, unique activation code."""
    chars = string.ascii_uppercase + string.digits
    while True:
        code = ''.join(random.choice(chars) for _ in range(length))
        if not ActivationCode.query.filter_by(code=code).first():
            return code

def get_trial_status(user):
    """Checks the trial status of a user."""
    if user.is_activated:
        return {'status': 'activated', 'message': 'Account is fully activated.'}
    
    if user.trial_start is None:
        user.trial_start = datetime.utcnow()
        db.session.commit()
        
    trial_days = 3 # 3 days trial
    trial_end = user.trial_start + timedelta(days=trial_days)
    
    if datetime.utcnow() < trial_end:
        days_left = (trial_end - datetime.utcnow()).days + 1 # +1 to show a full day remaining
        return {'status': 'trial', 'message': f'Trial active. {days_left} days remaining.'}
    else:
        # Check device limit for expired trial
        device_limit = 2 # Max 2 exams on expired trial per device
        device_id = get_device_id()
        exam_count = ExamResult.query.join(User).filter(
            User.device_id == device_id, 
            User.is_activated == False # Only count exams for non-activated users
        ).count()

        if exam_count < device_limit:
             return {'status': 'trial_expired_limited', 'message': f'Trial expired. Limited access ({device_limit - exam_count} left).'}

        return {'status': 'trial_expired', 'message': 'Trial expired and limited access used.'}

# -------------------- ROUTES --------------------

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/admin')
@admin_required
def admin_dashboard():
    return render_template('admin.html')

# -------------------- AUTH API --------------------

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    full_name = data.get('full_name')
    email = data.get('email')
    password = data.get('password')

    if not all([full_name, email, password]):
        return jsonify({'success': False, 'message': 'Missing fields.'})
    
    if User.query.filter(or_(User.email == email, User.full_name == full_name)).first():
        return jsonify({'success': False, 'message': 'User with this email or full name already exists.'})

    hashed_password = generate_password_hash(password, method='scrypt')
    device_id = get_device_id()

    new_user = User(
        full_name=full_name, 
        email=email, 
        password=hashed_password, 
        ip_address=request.remote_addr,
        device_id=device_id
    )

    try:
        db.session.add(new_user)
        db.session.commit()
        
        # Auto-login after registration
        session['user_id'] = new_user.id
        session['full_name'] = new_user.full_name
        
        # Create user session record
        new_session = UserSession(
            user_id=new_user.id,
            session_id=str(uuid.uuid4()),
            ip_address=request.remote_addr,
            is_active=True
        )
        db.session.add(new_session)
        db.session.commit()
        
        logger.info(f"New user registered: {new_user.email}")
        return jsonify({'success': True, 'message': 'Registration successful. Welcome to MSH CBT HUB!', 'redirect': url_for('index')})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Registration error: {str(e)}")
        return jsonify({'success': False, 'message': 'An internal error occurred during registration.'})


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not all([email, password]):
        return jsonify({'success': False, 'message': 'Email and password required.'})

    user = User.query.filter_by(email=email).first()

    if user and check_password_hash(user.password, password):
        # Update user details
        user.last_login = datetime.utcnow()
        user.ip_address = request.remote_addr
        user.device_id = get_device_id() # Update device ID on login
        db.session.commit()
        
        # Set session
        session['user_id'] = user.id
        session['full_name'] = user.full_name
        session['is_admin'] = user.is_admin
        session.permanent = True # Use permanent session lifetime

        # Mark all previous sessions as inactive
        UserSession.query.filter(
            UserSession.user_id == user.id,
            UserSession.is_active == True
        ).update({UserSession.is_active: False}, synchronize_session=False)

        # Create new active session record
        new_session = UserSession(
            user_id=user.id,
            session_id=str(uuid.uuid4()),
            ip_address=request.remote_addr,
            is_active=True
        )
        db.session.add(new_session)
        db.session.commit()
        
        logger.info(f"User logged in: {user.email}")
        return jsonify({'success': True, 'message': 'Login successful!', 'redirect': url_for('index')})
    else:
        return jsonify({'success': False, 'message': 'Invalid email or password.'})

@app.route('/api/logout', methods=['POST'])
@login_required
def logout():
    user_id = session.get('user_id')
    if user_id:
        # Mark current session as inactive
        try:
            current_session = UserSession.query.filter_by(user_id=user_id, is_active=True).order_by(UserSession.last_activity.desc()).first()
            if current_session:
                current_session.is_active = False
                db.session.commit()
        except Exception as e:
            logger.error(f"Error marking session as inactive for user {user_id}: {str(e)}")

    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully.'})

@app.route('/api/check_auth', methods=['GET'])
def check_auth():
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
        if user:
            # Update last activity for the active session
            try:
                current_session = UserSession.query.filter_by(user_id=user.id, is_active=True).order_by(UserSession.last_activity.desc()).first()
                if current_session:
                    current_session.last_activity = datetime.utcnow()
                    db.session.commit()
            except Exception as e:
                logger.error(f"Session activity update error: {str(e)}")

            trial_info = get_trial_status(user)
            return jsonify({
                'authenticated': True,
                'full_name': session['full_name'],
                'is_admin': user.is_admin,
                'trial_status': trial_info['status'],
                'trial_message': trial_info['message']
            })
    return jsonify({'authenticated': False})

@app.route('/api/user_info', methods=['GET'])
@login_required
def get_user_info():
    user = User.query.get(session['user_id'])
    if not user:
        return jsonify({'success': False, 'message': 'User not found.'})

    trial_info = get_trial_status(user)
    exam_count = ExamResult.query.filter_by(user_id=user.id).count()

    return jsonify({
        'success': True,
        'user': {
            'full_name': user.full_name,
            'email': user.email,
            'ip_address': user.ip_address,
            'status': trial_info['status'],
            'exam_count': exam_count,
            'join_date': user.created_at.strftime('%Y-%m-%d'),
            'trial_message': trial_info['message'],
            'is_admin': user.is_admin
        }
    })

# -------------------- EXAM API --------------------

@app.route('/api/start_exam', methods=['POST'])
@login_required
def start_exam():
    data = request.get_json()
    exam_type = data.get('exam_type', '').upper()
    selected_subjects = data.get('subjects', [])
    
    # Validation
    if exam_type not in ['JAMB', 'WAEC']:
        return jsonify({'success': False, 'message': 'Invalid exam type selected.'})
    
    if not selected_subjects or not isinstance(selected_subjects, list):
        return jsonify({'success': False, 'message': 'Please select at least one subject.'})

    # Basic subject count validation
    if exam_type == 'WAEC':
        if 'english' not in [s.lower() for s in selected_subjects]:
            return jsonify({
                'success': False,
                'message': 'WAEC requires English Language. Please check your selection.'
            })
    elif exam_type == 'JAMB':
        if len(selected_subjects) != 4:
             return jsonify({
                'success': False,
                'message': 'JAMB requires exactly 4 subjects (including English). Please check your selection.'
            })
        if 'english' not in [s.lower() for s in selected_subjects]:
            return jsonify({
                'success': False,
                'message': 'JAMB requires English Language. Please check your selection.'
            })


    # Trial Check
    user = User.query.get(session['user_id'])
    trial_info = get_trial_status(user)
    
    if trial_info['status'] == 'trial_expired':
        return jsonify({
            'success': False, 
            'message': 'Your trial has expired and limited access is used. Please activate your account.'
        })
    elif trial_info['status'] == 'trial_expired_limited':
        # Check device limit for expired trial
        device_id = get_device_id()
        device_limit = 2
        exam_count = ExamResult.query.join(User).filter(
            User.device_id == device_id, 
            User.is_activated == False
        ).count()
        
        if exam_count >= device_limit:
            return jsonify({ 'success': False, 'message': 'Your trial has expired and limited access is used up on this device. Please activate your account.' })
    # Allow 'trial' and 'activated' status to proceed

    # Prepare questions
    questions = prepare_questions(exam_type, selected_subjects)
    
    if not questions:
        return jsonify({'success': False, 'message': 'Could not load any questions for the selected subjects.'})

    # Calculate total time (e.g., 2 hours for JAMB 180 questions, 2.5 hours for WAEC 170 questions)
    # Total questions are roughly 170-190. Use 2 hours (7200s) as a general safe minimum.
    total_time_seconds = 7200 
    if exam_type == 'WAEC':
        total_time_seconds = 9000 # 2.5 hours for WAEC (40-60 questions per 9 subjects)
    
    # Store questions temporarily in the database, linked to the user's session
    session_id = request.headers.get('X-Session-ID', str(uuid.uuid4()))
    session['exam_session_id'] = session_id

    # Clear previous exam data
    TemporaryData.query.filter_by(session_id=session_id).delete()
    
    # Save current exam questions
    new_temp_data = TemporaryData(
        session_id=session_id,
        key='exam_questions',
        value=json.dumps(questions),
        expires_at=datetime.utcnow() + timedelta(hours=3) # Expires after 3 hours
    )
    db.session.add(new_temp_data)
    db.session.commit()
    
    logger.info(f"Exam started - User: {session['user_id']}, Type: {exam_type}, Subjects: {', '.join(selected_subjects)}, Qty: {len(questions)}")
    
    return jsonify({
        'success': True,
        'exam_session_id': session_id,
        'exam_type': exam_type,
        'total_questions': len(questions),
        'time_allowed': total_time_seconds
    })

@app.route('/api/load_questions', methods=['GET'])
@login_required
def load_exam_questions():
    exam_session_id = session.get('exam_session_id')
    
    if not exam_session_id:
        return jsonify({'success': False, 'message': 'No active exam session found.'})

    temp_data = TemporaryData.query.filter_by(
        session_id=exam_session_id, 
        key='exam_questions'
    ).first()
    
    if not temp_data or temp_data.expires_at < datetime.utcnow():
        return jsonify({'success': False, 'message': 'Exam data expired or not found.'})

    try:
        questions = json.loads(temp_data.value)
        
        # Prepare questions for client (remove correct_answer and explanation)
        client_questions = []
        for q in questions:
            client_q = q.copy()
            client_q.pop('correct_answer', None)
            client_q.pop('explanation', None)
            client_questions.append(client_q)
            
        return jsonify({
            'success': True,
            'questions': client_questions,
            'total_questions': len(questions)
        })
    except Exception as e:
        logger.error(f"Error loading exam questions: {str(e)}")
        return jsonify({'success': False, 'message': 'Error processing question data.'})


@app.route('/api/submit_exam', methods=['POST'])
@login_required
def submit_exam():
    data = request.get_json()
    exam_session_id = data.get('exam_session_id')
    user_answers = data.get('answers', {})
    exam_type = data.get('exam_type')
    duration_seconds = data.get('duration_seconds')

    if not exam_session_id or not user_answers:
        return jsonify({'success': False, 'message': 'Invalid submission data.'})

    temp_data = TemporaryData.query.filter_by(
        session_id=exam_session_id, 
        key='exam_questions'
    ).first()

    if not temp_data:
        return jsonify({'success': False, 'message': 'Original exam data not found. Cannot grade.'})
    
    # Prevent double submission
    if TemporaryData.query.filter_by(session_id=exam_session_id, key='exam_submitted').first():
        return jsonify({'success': False, 'message': 'Exam has already been submitted.'})

    try:
        original_questions = json.loads(temp_data.value)
        total_questions = len(original_questions)
        correct = 0
        questions_with_results = []
        subjects_list = set()
        
        for original_q in original_questions:
            q_id = str(original_q.get('id'))
            user_ans = user_answers.get(q_id)
            is_correct = False
            
            if user_ans and user_ans.upper() == original_q.get('correct_answer', '').upper():
                correct += 1
                is_correct = True
            
            # Prepare data for detailed result review
            result_q = original_q.copy()
            result_q['user_answer'] = user_ans
            result_q['is_correct'] = is_correct
            questions_with_results.append(result_q)
            
            # Collect subjects
            subjects_list.add(original_q.get('subject', 'Unknown'))
            
        percentage = (correct / total_questions) * 100 if total_questions > 0 else 0
        
        # Save result to permanent table
        new_result = ExamResult(
            user_id=session['user_id'],
            exam_type=exam_type,
            score=correct,
            total_questions=total_questions,
            percentage=round(percentage, 2),
            subjects=', '.join(sorted(list(subjects_list))),
            duration_seconds=duration_seconds,
            questions_data=json.dumps(questions_with_results)
        )
        db.session.add(new_result)
        
        # Mark exam as submitted to prevent re-submission
        submitted_marker = TemporaryData(
            session_id=exam_session_id,
            key='exam_submitted',
            value='true',
            expires_at=datetime.utcnow() + timedelta(hours=1)
        )
        db.session.add(submitted_marker)
        
        # Update user's exam count if on limited trial
        user = User.query.get(session['user_id'])
        if user and not user.is_activated and user.trial_start and datetime.utcnow() > (user.trial_start + timedelta(days=3)):
             device_id = get_device_id()
             # We don't need to explicitly update the count here, the next trial status check will use the updated count

        db.session.commit()
        
        logger.info(f"Exam submitted - User: {session['user_id']}, Score: {correct}/{total_questions} ({percentage}%)")
        
        # Clear the exam_questions key immediately after grading
        temp_data.expires_at = datetime.utcnow() - timedelta(minutes=1)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Exam submitted successfully!',
            'score': correct,
            'total_questions': total_questions,
            'percentage': round(percentage, 2),
            'result_id': new_result.id
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Exam submission error: {str(e)}")
        return jsonify({'success': False, 'message': 'An internal error occurred during submission.'})

@app.route('/api/result/<int:result_id>', methods=['GET'])
@login_required
def get_exam_result(result_id):
    result = ExamResult.query.filter_by(id=result_id, user_id=session['user_id']).first()
    
    if not result:
        return jsonify({'success': False, 'message': 'Result not found or access denied.'})
    
    try:
        questions_data = json.loads(result.questions_data)
        
        return jsonify({
            'success': True,
            'result': {
                'id': result.id,
                'exam_type': result.exam_type,
                'score': result.score,
                'total_questions': result.total_questions,
                'percentage': result.percentage,
                'subjects': result.subjects,
                'duration_seconds': result.duration_seconds,
                'taken_at': result.taken_at.strftime('%Y-%m-%d %H:%M'),
                'questions_data': questions_data
            }
        })
    except Exception as e:
        logger.error(f"Error retrieving result data: {str(e)}")
        return jsonify({'success': False, 'message': 'Error processing result data.'})


@app.route('/api/recent_activity', methods=['GET'])
@login_required
def get_recent_activity():
    try:
        recent_results = ExamResult.query.filter_by(user_id=session['user_id']).order_by(ExamResult.taken_at.desc()).limit(10).all()
        
        activity = []
        for result in recent_results:
            activity.append({
                'id': result.id,
                'exam_type': result.exam_type,
                'score': f"{result.score}/{result.total_questions}",
                'percentage': f"{result.percentage}%",
                'subjects': result.subjects,
                'taken_at': result.taken_at.strftime('%Y-%m-%d %H:%M')
            })
            
        return jsonify({'success': True, 'activity': activity})
    except Exception as e:
        logger.error(f"Recent activity error: {str(e)}")
        return jsonify({'success': False, 'message': 'Error loading recent activity'})

# -------------------- ACTIVATION SYSTEM --------------------
@app.route('/api/activate', methods=['POST'])
@login_required
def activate_account():
    data = request.get_json()
    code = data.get('code', '').strip().upper()
    
    if not code:
        return jsonify({'success': False, 'message': 'Activation code is required.'})

    user = User.query.get(session['user_id'])
    if not user:
        return jsonify({'success': False, 'message': 'User not found.'})
    
    if user.is_activated:
        return jsonify({'success': False, 'message': 'Account is already activated.'})

    activation_entry = ActivationCode.query.filter_by(code=code, is_used=False).first()

    if activation_entry:
        # Activate user
        user.is_activated = True
        user.activation_code = code
        
        # Mark code as used
        activation_entry.is_used = True
        activation_entry.used_by = user.id
        activation_entry.used_at = datetime.utcnow()
        
        db.session.commit()
        logger.info(f"User {user.email} activated account with code: {code}")
        return jsonify({
            'success': True, 
            'message': 'Account successfully activated! You now have full access.'
        })
    else:
        # Check if code exists but is used
        used_code = ActivationCode.query.filter_by(code=code).first()
        if used_code:
            return jsonify({'success': False, 'message': 'This activation code has already been used.'})
        
        return jsonify({'success': False, 'message': 'Invalid activation code.'})

# -------------------- ADMIN API --------------------

@app.route('/api/admin/users', methods=['GET'])
@admin_required
def admin_get_users():
    try:
        users = User.query.all()
        user_list = []
        for user in users:
            trial_info = get_trial_status(user)
            exam_count = ExamResult.query.filter_by(user_id=user.id).count()
            user_list.append({
                'id': user.id,
                'full_name': user.full_name,
                'email': user.email,
                'is_activated': user.is_activated,
                'is_admin': user.is_admin,
                'ip_address': user.ip_address,
                'join_date': user.created_at.strftime('%Y-%m-%d'),
                'trial_status': trial_info['status'],
                'exam_count': exam_count
            })
        return jsonify({'success': True, 'users': user_list})
    except Exception as e:
        logger.error(f"Admin user fetch error: {str(e)}")
        return jsonify({'success': False, 'message': 'Error fetching user data.'})

@app.route('/api/admin/codes', methods=['GET'])
@admin_required
def admin_get_codes():
    try:
        codes = ActivationCode.query.order_by(ActivationCode.created_at.desc()).all()
        code_list = []
        for code in codes:
            code_list.append({
                'id': code.id,
                'code': code.code,
                'is_used': code.is_used,
                'used_by': code.used_by,
                'used_at': code.used_at.strftime('%Y-%m-%d %H:%M') if code.used_at else 'N/A',
                'expires_at': code.expires_at.strftime('%Y-%m-%d') if code.expires_at else 'N/A',
                'created_at': code.created_at.strftime('%Y-%m-%d')
            })
        return jsonify({'success': True, 'codes': code_list})
    except Exception as e:
        logger.error(f"Admin code fetch error: {str(e)}")
        return jsonify({'success': False, 'message': 'Error fetching activation codes.'})

@app.route('/api/admin/generate_code', methods=['POST'])
@admin_required
def admin_generate_code():
    data = request.get_json()
    days = data.get('days', 150)
    
    try:
        code = generate_activation_code()
        expires_at = datetime.utcnow() + timedelta(days=days)
        activation_code = ActivationCode(code=code, expires_at=expires_at)
        db.session.add(activation_code)
        db.session.commit()
        
        logger.info(f"Admin generated new code: {code}")
        return jsonify({'success': True, 'code': code, 'message': 'New code generated successfully.'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Admin code generation error: {str(e)}")
        return jsonify({'success': False, 'message': 'Error generating code.'})


@app.route('/api/admin/export_data', methods=['GET'])
@admin_required
def admin_export_data():
    try:
        # Export Users
        users = User.query.all()
        user_data = []
        for u in users:
            user_data.append({
                'id': u.id,
                'full_name': u.full_name,
                'email': u.email,
                'is_activated': u.is_activated,
                'is_admin': u.is_admin,
                'join_date': u.created_at.strftime('%Y-%m-%d'),
                'last_login': u.last_login.strftime('%Y-%m-%d %H:%M') if u.last_login else 'N/A'
            })
        
        # Export Results
        results = ExamResult.query.all()
        result_data = []
        for r in results:
            result_data.append({
                'id': r.id,
                'user_id': r.user_id,
                'exam_type': r.exam_type,
                'score': r.score,
                'total_questions': r.total_questions,
                'percentage': r.percentage,
                'subjects': r.subjects,
                'taken_at': r.taken_at.strftime('%Y-%m-%d %H:%M')
            })
            
        export_content = {
            'users': user_data,
            'exam_results': result_data
        }
        
        # Save to a temporary file
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        file_path = f'/tmp/msh_cbt_export_{timestamp}.json'
        with open(file_path, 'w') as f:
            json.dump(export_content, f, indent=4)
        
        return send_file(file_path, as_attachment=True, download_name=f'msh_cbt_export_{timestamp}.json', mimetype='application/json')
        
    except Exception as e:
        logger.error(f"Admin export error: {str(e)}")
        return jsonify({'success': False, 'message': f'Error during data export: {str(e)}'})

# -------------------- INITIALIZATION & RUN --------------------

# Context processor to expose user info to all templates
@app.context_processor
def inject_user():
    user = None
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
    return dict(user=user)

@app.before_request
def before_request():
    # Run data cleanup periodically (e.g., every 6 hours)
    last_cleanup = session.get('last_cleanup')
    if not last_cleanup or datetime.utcnow() - datetime.fromisoformat(last_cleanup) > timedelta(hours=6):
        clean_expired_data()
        session['last_cleanup'] = datetime.utcnow().isoformat()

# Database and initial data setup
def initialize_application():
    try:
        with app.app_context():
            db.create_all()
            logger.info("Database tables created successfully")
            
            # Create indices for better performance
            try:
                db.session.execute(db.text('CREATE INDEX IF NOT EXISTS idx_temporary_data_expires ON temporary_data(expires_at)'))
                db.session.execute(db.text('CREATE INDEX IF NOT EXISTS idx_user_sessions_activity ON user_session(last_activity)'))
                db.session.execute(db.text('CREATE INDEX IF NOT EXISTS idx_exam_result_user_id ON exam_result(user_id)'))
                db.session.commit()
            except Exception as e:
                 logger.warning(f"Failed to create database indices (may be fine on some DB types): {str(e)}")

            if ActivationCode.query.count() == 0:
                logger.info("Creating initial activation codes...")
                for _ in range(10):
                    code = generate_activation_code()
                    expires_at = datetime.utcnow() + timedelta(days=150)
                    activation_code = ActivationCode(code=code, expires_at=expires_at)
                    db.session.add(activation_code)
                db.session.commit()
                logger.info("Initial activation codes created")
            
            logger.info("MSH CBT HUB Application V2 Initialized Successfully")
    except Exception as e:
        logger.error(f"Application initialization failed: {str(e)}")

initialize_application()

# -------------------- RUN --------------------
if __name__ == '__main__':
    print("🚀 Starting MSH CBT HUB Server - VERSION 2...")
    print("✅ All V2 requirements implemented:")
    print("   ✅ CRITICAL BUG FIX: English questions now load properly") # This print statement is now TRUE!
    print("   ✅ Enhanced question loading with English priority")
    print("   ✅ Performance optimizations")
    print("   ✅ Template splitting for faster loading")
    print("⚠️  IMPORTANT: Ensure you set the SECRET_KEY environment variable!")
    print("📁 Running with templates/ and static/ folders")
    print("📝 Note: Ensure question JSON files exist in the same root folder as app.py")
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
