from flask import Flask, request, jsonify
from flask_cors import CORS
import hmac
import hashlib
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Токен Telegram
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")

def get_db_connection():
    """Создание подключения к базе данных"""
    try:
        return psycopg2.connect(os.getenv('DATABASE_URL'))
    except Exception as e:
        print(f"Ошибка подключения к БД: {e}")
        return None

def verify_telegram_auth(data):
    """Верификация данных авторизации Telegram"""
    auth_data = dict(data)
    hash_received = auth_data.pop('hash', None)
    if not hash_received:
        return False
    check_string = "\n".join(f"{key}={auth_data[key]}" for key in sorted(auth_data.keys()))
    secret_key = hashlib.sha256(TELEGRAM_TOKEN.encode()).digest()
    expected_hash = hmac.new(secret_key, check_string.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(hash_received, expected_hash)

@app.route('/api/auth', methods=['POST'])
def auth():
    """Эндпоинт авторизации Telegram"""
    try:
        data = request.json
        if not verify_telegram_auth(data):
            return jsonify({"error": "Invalid Telegram authorization"}), 403
        return jsonify({"message": "Authorization successful", "user": data})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/novels', methods=['GET', 'POST'])
def novels_route():
    """Эндпоинт для работы с новеллами"""
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        if request.method == 'GET':
            page = int(request.args.get('page', 1))
            page_size = int(request.args.get('pageSize', 10))
            offset = (page - 1) * page_size
            
            cur.execute("""
                SELECT * FROM novels 
                ORDER BY created_at DESC 
                LIMIT %s OFFSET %s
            """, (page_size, offset))
            
            novels = cur.fetchall()
            return jsonify(novels)
            
        elif request.method == 'POST':
            data = request.json
            cur.execute("""
                INSERT INTO novels (title, description, tags, total_chapters, author, year_started)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                data['title'],
                data['description'],
                data['tags'],
                data['totalChapters'],
                data['author'],
                data['yearStarted']
            ))
            
            new_novel = cur.fetchone()
            conn.commit()
            return jsonify({"message": "Новелла добавлена!", "novel": new_novel}), 201
            
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 400
    finally:
        cur.close()
        conn.close()

@app.route('/api/chapters', methods=['GET', 'POST'])
def chapters_route():
    """Эндпоинт для работы с главами"""
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        if request.method == 'GET':
            novel_id = request.args.get('novel_id')
            if not novel_id:
                return jsonify({"error": "Novel ID is required"}), 400
                
            cur.execute("""
                SELECT * FROM chapters 
                WHERE novel_id = %s 
                ORDER BY chapter_number
            """, (novel_id,))
            
            chapters = cur.fetchall()
            return jsonify(chapters)
            
        elif request.method == 'POST':
            data = request.json
            cur.execute("""
                INSERT INTO chapters (novel_id, chapter_number, title, text)
                VALUES (%s, %s, %s, %s)
                RETURNING *
            """, (
                data['novelId'],
                data['chapterNumber'],
                data['title'],
                data['text']
            ))
            
            new_chapter = cur.fetchone()
            conn.commit()
            return jsonify({"message": "Глава добавлена!", "chapter": new_chapter}), 201
            
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 400
    finally:
        cur.close()
        conn.close()

@app.route('/api/tags', methods=['GET'])
def get_tags():
    """Эндпоинт для получения всех уникальных тегов"""
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT DISTINCT unnest(tags) as tag 
            FROM novels 
            ORDER BY tag
        """)
        
        tags = [row[0] for row in cur.fetchall()]
        return jsonify(tags)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    finally:
        cur.close()
        conn.close()

@app.route('/api/init-db', methods=['POST'])
def init_db():
    """Эндпоинт инициализации базы данных"""
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        cur = conn.cursor()
        
        # Читаем SQL-скрипт
        with open('database/schema.sql', 'r') as file:
            cur.execute(file.read())
        
        conn.commit()
        return jsonify({"message": "База данных успешно инициализирована!"})
        
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    app.run(debug=True)
