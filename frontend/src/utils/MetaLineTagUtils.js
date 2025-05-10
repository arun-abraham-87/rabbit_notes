import { updateNoteById } from "./ApiUtils"

const tag_type_expense = "EXPENSE"
const tag_type_income = "INCOME"
const tag_type_exclude_from_budget = "EXCLUDE_FROM_BUDGET"
const tag_type_description = "DESCRIPTION"
const tag_type_tags = "TAGS"
const tag_type_once_off = "ONCE_OFF"

export const extract_mlt_from_line = (line) => {
    const match = line.match(/mlt::"[^"]+"/);
    const mlt = match ? match[0] : null; // match[0] returns the full match including mlt:: and quotes
    return mlt;
}

export const add_mlt_to_line = (line, mlt) => {
    return `${line} ${mlt}`;
}

export const replace_mlt_in_line = (line, new_mlt) => {
    const base_content = line.replace(/mlt::[^"]+"/, '').trim();
    return `${base_content} ${new_mlt}`;
}

export const get_all_params = (mlt_line) => {
    const params = mlt_line.split('|');
   // console.log('params', params);
    return {
        tag_type_expense: params[0],
        tag_type_income: params[1],
        tag_type_description: params[2],
        tag_type_tags: params[3],
        tag_type_exclude_from_budget: params[4],
        tag_type_once_off: params[5]
    }
}

export const get_mlt = (expense_type, income, description, tags, exclude_from_budget, once_off) => {
    const params = {
        tag_type_expense: expense_type,
        tag_type_income: income,
        tag_type_description: description,
        tag_type_tags: tags,
        tag_type_exclude_from_budget: exclude_from_budget,
        tag_type_once_off: once_off
    }
    return get_mlt_from_params(params);
}

export const get_mlt_from_params = (params) => {
    return `mlt::"${params.tag_type_expense}|${params.tag_type_income}|${params.tag_type_description}|${params.tag_type_tags}|${params.tag_type_exclude_from_budget}|${params.tag_type_once_off}"`
}

export const get_tags = (mlt_line) => {
    const mlt = get_all_params(mlt_line);
    const tags = mlt.tag_type_tags;
    return tags.split('||');
}

export const get_description = (mlt_line) => {
    const mlt = get_all_params(mlt_line);
    const description = mlt.tag_type_description;
    return description;
}

export const get_is_income = (mlt_line) => {
    const mlt = get_all_params(mlt_line);
    const income = mlt.tag_type_income;
    return income;
}

export const get_is_exclude_from_budget = (mlt_line) => {
    const mlt = get_all_params(mlt_line);
    const exclude_from_budget = mlt.tag_type_exclude_from_budget;
    return exclude_from_budget;
}

export const get_expense_type = (mlt_line) => {
    const mlt = get_all_params(mlt_line);
    const expense_type = mlt.tag_type_expense;
    return expense_type;
}

export const set_value_in_mlt = (mlt_line, type, value) => {
    const params = get_all_params(mlt_line);
    if (type === tag_type_expense) {
        params.tag_type_expense = value;
    } else if (type === tag_type_income) {
        params.tag_type_income = value;
    } else if (type === tag_type_exclude_from_budget) {
        params.tag_type_exclude_from_budget = value;
    } else if (type === tag_type_once_off) {
        params.tag_type_once_off = value;
    } else if (type === tag_type_description) {
        params.tag_type_description = value;
    } else if (type === tag_type_tags) {
        params.tag_type_tags = value;
    }
    return get_mlt_from_params(params);
}

export const add_tag_to_mlt = (mlt_line, tag_value) => {
    const tags = get_tags(mlt_line);
    if (!tags.includes(tag_value)) {
        tags.push(tag_value);
    }
    return set_value_in_mlt(mlt_line, tag_type_tags, tags.join('||'));
}

export const remove_tag_from_mlt = (mlt_line, tag_value) => {
    const tags = get_tags(mlt_line);
    if (tags.includes(tag_value)) {
        tags.splice(tags.indexOf(tag_value), 1);
    }
    return set_value_in_mlt(mlt_line, tag_type_tags, tags.join('||'));
}

export const get_line_from_note = (note_content, line_index) => {
    const lines = note_content.split('\n');
    return lines[line_index];
}

export const replace_line_in_note = (note_content, line_index, new_line) => {
    const lines = note_content.split('\n');
    lines[line_index] = new_line;
    return lines.join('\n');
}

export const set_description_in_mlt = async (note_content, note_id, line_index, description) => {
    let line = get_line_from_note(note_content, line_index);
    let mlt_line = extract_mlt_from_line(line);
    mlt_line = set_value_in_mlt(mlt_line, tag_type_description, description);
    let replaced_line = replace_mlt_in_line(line, mlt_line);
    let replaced_note_content = replace_line_in_note(note_content, line_index, replaced_line);
    if (note_id) {
        await updateNoteById(note_id, replaced_note_content);
    }
    return replaced_note_content;
}

export const set_expense_type_in_mlt = async (note_content, note_id, line_index, expense_type) => {
    let line = get_line_from_note(note_content, line_index);
    let mlt_line = extract_mlt_from_line(line);

    // If no mlt exists, create a new one with default values
    if (!mlt_line) {
        mlt_line = `mlt::"${expense_type}|||false|false"`;
    } else {
        mlt_line = set_value_in_mlt(mlt_line, tag_type_expense, expense_type);
    }

    let replaced_line = replace_mlt_in_line(line, mlt_line);
    let replaced_note_content = replace_line_in_note(note_content, line_index, replaced_line);
    if (note_id) {
        await updateNoteById(note_id, replaced_note_content);
    }
    return replaced_note_content;
}

export const set_income_in_mlt = async (note_content, note_id, line_index, income) => {
    let line = get_line_from_note(note_content, line_index);
    let mlt_line = extract_mlt_from_line(line);
    mlt_line = set_value_in_mlt(mlt_line, tag_type_income, income);
    let replaced_line = replace_mlt_in_line(line, mlt_line);
    let replaced_note_content = replace_line_in_note(note_content, line_index, replaced_line);
    if (note_id) {
        await updateNoteById(note_id, replaced_note_content);
    }
    return replaced_note_content;
}

export const set_exclude_from_budget_in_mlt = async (note_content, note_id, line_index, exclude) => {
    let line = get_line_from_note(note_content, line_index);
    let mlt_line = extract_mlt_from_line(line);
    mlt_line = set_value_in_mlt(mlt_line, tag_type_exclude_from_budget, exclude ? 'true' : 'false');
    let replaced_line = replace_mlt_in_line(line, mlt_line);
    let replaced_note_content = replace_line_in_note(note_content, line_index, replaced_line);
    if (note_id) {
        await updateNoteById(note_id, replaced_note_content);
    }
    return replaced_note_content;
}

export const set_once_off_in_mlt = async (note_content, note_id, line_index, once_off) => {
    let line = get_line_from_note(note_content, line_index);
    let mlt_line = extract_mlt_from_line(line);
    mlt_line = set_value_in_mlt(mlt_line, tag_type_once_off, once_off ? 'true' : 'false');
    let replaced_line = replace_mlt_in_line(line, mlt_line);
    let replaced_note_content = replace_line_in_note(note_content, line_index, replaced_line);
    if (note_id) {
        await updateNoteById(note_id, replaced_note_content);
    }
    return replaced_note_content;
}

export const get_basic_mlt = () => {
    return `mlt::"null|false|null|null|false|false"`;
}

export const set_tags_in_mlt = async (note_content, note_id, line_index, tags) => {
    console.log('set_tags_in_mlt', note_id, line_index, tags);
    let line = get_line_from_note(note_content, line_index);
    console.log('line', line);
    let mlt_line = line_has_mlt(line) ? extract_mlt_from_line(line) : get_basic_mlt();
    console.log('mlt_line1', mlt_line);
    mlt_line = set_value_in_mlt(mlt_line, tag_type_tags, tags.length > 0 ? `<${tags.join(',')}>` : '');
    console.log('mlt_line2', mlt_line);
    let replaced_line = replace_mlt_in_line(line, mlt_line);

    console.log('replaced_line', replaced_line);
    let replaced_note_content = replace_line_in_note(note_content, line_index, replaced_line);

    if (note_id) {
      //  console.log('Called Note Update')
      //  await updateNoteById(note_id, replaced_note_content);
    }

    return replaced_note_content;
}


export const line_has_mlt = (line) => {
    return line.includes('mlt::');
}