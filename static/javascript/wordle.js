LETTER_INDEX = 0;
ROW_INDEX = 1;
PLAYER_NUM = null;
PLAYER_TURN = 1;
function connect_to_server() {
    // Get player & game info
    let name = document.getElementById("name-input").value;
    let game_id = document.getElementById("join-input").value;
    // Change visibility
    document.getElementById("setup-menu").className = "hidden";
    document.getElementById("game-room").className = "visible";
    // Connect to server
    socket = io.connect('http://127.0.0.1:5000');
    socket.on('connect', function(){
        socket.emit('client-connection', {'name': name, 'game_id': game_id});
    });
    once_connected(socket);
}
function once_connected(socket){
    socket.on('client-information', function(game_info){
        console.log("RECEIVED INFO");
        console.log(game_info);
        // Read in data
        let game_id = game_info['game_id'];
        let player_1 = game_info['player_1'];
        let player_2 = game_info['player_2'];
        if (PLAYER_NUM == null) {
            if (player_2 == "Waiting to Connect") {
                PLAYER_NUM = 1;
            }
            else {
                PLAYER_NUM = 2;
            }
        }
        // Set names
        document.getElementById("player-1-name").innerHTML = player_1;
        document.getElementById("player-2-name").innerHTML = player_2;
        // Set Game ID
        document.getElementById("game-id").innerHTML = game_id;
    });
    socket.on('guess-feedback', function(data){
        // Case where word was not valid
        if (!data['valid']){
            if (PLAYER_NUM == PLAYER_TURN) {
                document.getElementById("lower-message").innerHTML = "Not a valid word - guess again";
            }
            return
        }
        document.getElementById("lower-message").innerHTML = ""
        let guess = data['guess'];
        let feedback = data['feedback'];
        // If word was a valid guess
        // Flip player turn
        if (PLAYER_TURN == 1) {
            PLAYER_TURN = 2;
        }
        else {
            PLAYER_TURN = 1;
        }
        // Increment row number & reset letter index
        ROW_INDEX += 1;
        LETTER_INDEX = 0;
        // Shade previous rows letters
        for (let i = 1; i <= 5; i++) {
            let color = "white";
            if (feedback[i - 1] == 1) {
                color = "#FAFDBA";
            }
            else if (feedback[i - 1] == 2) {
                color = "#B2F97B";
            }
            document.getElementById('row-' + (ROW_INDEX - 1) + '-letter-' + i).style.backgroundColor = color;
            document.getElementById('row-' + (ROW_INDEX - 1) + '-letter-' + i).innerHTML = guess[i - 1];
        }
        // If word was completely correct
        if (!(feedback.includes(1) || feedback.includes(0))) {
            document.getElementById("lower-message").innerHTML = "Congratulations - your team guessed the word in " + (ROW_INDEX - 1) + " guesses!";
            PLAYER_TURN = -1; // Neither player can go again because word was guessed
            return
        }
        else if (ROW_INDEX >= 6){
            // Team didn't get the word
            let game_id = document.getElementById("game-id").innerHTML;
            socket.emit('requesting-correct', game_id);
        }
    });
    socket.on('correct-word', function(correct){
        document.getElementById("lower-message").innerHTML = "Your team didn't get it - the word was " + correct;
    });
    document.onkeydown = function (e) {
        if (PLAYER_NUM == PLAYER_TURN) {
            if (LETTER_INDEX >= 5 && e.keyCode == 13) {
                // Get guess from divs
                let guess = "";
                for (let i = 1; i <= 5; i++) {
                    guess = guess.concat(document.getElementById('row-' + ROW_INDEX + '-letter-' + i).innerHTML);
                }
                // Send guess to server
                let game_id = document.getElementById("game-id").innerHTML;
                socket.emit('client-guess', {'guess': guess, 'game_id': game_id});
            }
            if (e.keyCode == 8) {
                key = "";
            }
            else if ((e.keyCode >= 65 && e.keyCode <= 90) || (e.keyCode >= 97 && e.keyCode <= 122)) {
                // Letter passed
                key = e.key;
            }
            else {
                return;
            }
            if (LETTER_INDEX < 1) {
                LETTER_INDEX = 1;
            }
            else if (LETTER_INDEX > 5) {
                LETTER_INDEX = 5;
            }
            console.log(key);
            curr_box = document.getElementById('row-' + ROW_INDEX + '-letter-' + LETTER_INDEX);
            curr_box.innerHTML = key;
            if (e.keyCode == 8) {
                LETTER_INDEX -= 1;
            }
            else if ((e.keyCode >= 65 && e.keyCode <= 90) || (e.keyCode >= 97 && e.keyCode <= 122)) {
                LETTER_INDEX += 1;
            }
        }
    }
}
