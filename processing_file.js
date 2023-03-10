﻿class ProcessingFile {
	constructor(_file_name, _text, _FIRST_STRINGS_LENGTH, _LAST_STRINGS_LENGTH) {
		this.file_name = _file_name
		this.FIRST_STRINGS_LENGTH = _FIRST_STRINGS_LENGTH;
		this.LAST_STRINGS_LENGTH = _LAST_STRINGS_LENGTH;
		this.full_text = _text
		this.pre_sentences = this.getFixPoints(this.full_text)
		this.all_sentences = this.get_fix_section(this.pre_sentences)
	}

	getFixPoints(text) {
	  const result = [];
	  const pointsList = text.split('\n').filter(Boolean);
	  
	  for (let points of pointsList) {
		if ([". ", ", ", "! ", "? ", ": ", "; ", "- "].includes(points.slice(-2))) {
		  result.push(points);
		} else {
		  result.push(points + ".");
		}
	  }
	  
	  return result;
	}

	get_fix_section(sentences) {
	  let result = [];
	  let current_text = "";

	  for (let i = 0; i < sentences.length; i++) {
		let line = sentences[i];
		let words = line.split(" ");
		for (let j = 0; j < words.length; j++) {
		  let word = words[j];
		  if (current_text.length + word.length > this.LAST_STRINGS_LENGTH && [".", ",", "!", "?", ":", ";", "-"].includes(word[word.length - 1])) {
			result.push(current_text + word);
			current_text = "";
		  } else {
			if (current_text.length > 0) {
			  current_text += " ";
			}
			current_text += word;
		  }
		}
		if (current_text.length > 0) {
		  current_text += "\n";
		}
	  }
	  if (current_text.length > 0) {
		result.push(current_text);
	  }
	  return result;
	}
}
