from flask import Flask, render_template
from flask_socketio import SocketIO, emit


PLAYERS_CONNECTED = []
TESTING_WORD = "tests"
with open('valid-wordle-words.txt') as f:
    VALID_WORDS = f.read().splitlines()

app = Flask(__name__, template_folder='templates', static_folder='static', static_url_path='/static/')
socketio = SocketIO(app, cors_allowed_origins="*")

@app.route('/')
def index():
    return render_template('wordle.html')

@socketio.on('client-guess')
def receive_guess(client_guess):
    print("Guess Received")
    is_valid, feedback = check_guess(client_guess)
    emit('guess-feedback', {'valid': is_valid, 'guess': client_guess, 'feedback': feedback}, broadcast=True)

@socketio.on('client-connection')
def connect_client(client_name):
    global PLAYERS_CONNECTED
    print(f"{client_name} has connected")
    client_info = {'player_num': len(PLAYERS_CONNECTED) + 1,
                   'player_name': client_name}
    PLAYERS_CONNECTED.append(client_info)
    emit('client-information', PLAYERS_CONNECTED, broadcast=True)

def check_guess(guess):
    """
    :param guess:
    :return:
    - a boolean value indicating if the word is a valid word or not
    - an array of length 5 with values 0, 1, or 2
        0 signifies the letter is not in the word
        1 signifies the letter is in the word and in the wrong position
        2 signifies the letter is in the word and in the right position
    """
    global TESTING_WORD
    global VALID_WORDS
    guess = guess.lower()
    # Check if the word is valid
    valid = guess in VALID_WORDS
    feedback = []
    assert(len(TESTING_WORD) == 5)
    assert(len(guess) == 5)
    for i in range(0, 5):
        if guess[i] == TESTING_WORD[i]:
            feedback.append(2)
        elif guess[i] in TESTING_WORD:
            feedback.append(1)
        else:
            feedback.append(0)
    return valid, feedback



if __name__ == '__main__':
    socketio.run(app)
