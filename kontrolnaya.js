function makeFinalBookTasks(random) {
  const alphabet = '0123456789ABCDEFGHIJ';
  const letters = ['Е', 'Л', 'Н', 'О', 'С', 'Ц'];
  const plural = new Intl.PluralRules('ru');
  const pick = (min, max) => min + Math.floor(random() * (max - min + 1));
  const format = (value, base) => value.toString(base).toUpperCase();
  const indexed = (record, base) => '<b>' + record + '<sub>' + base + '</sub></b>';
  const calculate = (left, operator, right, base) =>
    indexed(left, base) + ' ' + operator + ' ' + indexed(right, base);
  const tuple = (values) => '(' + values.join(', ') + ')';
  const text = (label, answer, normalization = 'integer') => ({
    label, kind: 'text', expected: String(answer), normalization, points: 1,
  });
  const remainder = (value, divisor) => ((value % divisor) + divisor) % divisor;
  const toPlaces = (value, bases) => {
    const values = [];
    for (let i = bases.length - 1; i >= 0; i -= 1) {
      values.unshift(value % bases[i]);
      value = Math.floor(value / bases[i]);
    }
    return values;
  };
  const word = (value) => toPlaces(value, [6, 6]).map((digit) => letters[digit]).join('');
  const onPage = (...paragraphs) => paragraphs.map((paragraph) => '<p>' + paragraph + '</p>').join('');
  const tasks = [];

  {
    const base = pick(4, 10);
    const short = format(pick(base, 2 * base - 1), base);
    const large = format(pick(base ** 3, base ** 3 + 20), base);
    const padded = short.padStart(large.length, '0');
    const smallerFirst = pick(0, 1) === 0;
    const pair = smallerFirst ? [short, large] : [large, short];
    const alphabetBase = pick(11, 19);
    const ordinaryBase = pick(2, 9);
    const candidates = [
      {record: '1' + alphabet[ordinaryBase - 1], base: ordinaryBase, allowed: true},
      {record: '1' + alphabet[ordinaryBase], base: ordinaryBase, allowed: false},
      {record: '2' + alphabet[alphabetBase - 1], base: alphabetBase, allowed: true},
      {record: '2' + alphabet[alphabetBase], base: alphabetBase, allowed: false},
    ];
    for (let i = candidates.length - 1; i > 0; i -= 1) {
      const j = pick(0, i);
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    tasks.push({
      title: 'Допустимые цифры и сравнение',
      prompt: 'Сначала отметьте все допустимые записи. Затем выровняйте две записи из пары, дописав нули слева к короткой, и поставьте между ними знак сравнения.',
      context: onPage(indexed(pair[0], base) + ' ☐ ' + indexed(pair[1], base)),
      parts: [
        {
          label: 'Допустимые записи', kind: 'checkbox', points: 1,
          options: candidates.map((candidate, i) => ({
            value: String(i), label: candidate.record + ' в основании ' + candidate.base,
          })),
          expected: candidates.flatMap((candidate, i) => candidate.allowed ? [String(i)] : []),
          answer: candidates.filter((candidate) => candidate.allowed)
            .map((candidate) => candidate.record + ' в основании ' + candidate.base).join(', '),
        },
        text('Короткая запись после выравнивания', padded, 'literal'),
        {
          label: 'Знак между числами в указанном порядке', kind: 'radio', points: 1,
          options: ['<', '=', '>'].map((symbol) => ({value: symbol, label: symbol})),
          expected: smallerFirst ? '<' : '>',
        },
      ],
      explanation: onPage(
        'Значение каждой допустимой цифры меньше основания. Допустимы ' +
          candidates.filter((candidate) => candidate.allowed)
            .map((candidate) => indexed(candidate.record, candidate.base)).join(' и ') + '.',
        'Ведущие нули не меняют значения. После выравнивания короткая запись выглядит как ' +
          indexed(padded, base) + '. В первом разряде слева у неё 0, а у длинной записи ' + large[0] + '.',
      ),
    });
  }

  {
    const basePairs = [[3, 5], [4, 2], [5, 8], [6, 3], [7, 4], [8, 5], [12, 4], [16, 7], [18, 6]];
    const [base, target] = basePairs[pick(0, basePairs.length - 1)];
    const first = base > 10 ? 1 : pick(1, 2);
    const second = pick(0, 2) === 0 ? 0 : pick(1, base - 1);
    const third = pick(0, base - 1);
    const source = [first, second, third].map((digit) => alphabet[digit]).join('');
    const prefix = first * base + second;
    const value = prefix * base + third;
    const result = format(value, target);
    const divisions = [];
    for (let current = value; current > 0; current = Math.floor(current / target)) {
      divisions.push(current + ' = ' + Math.floor(current / target) + ' · ' + target + ' + ' + current % target);
    }
    tasks.push({
      title: 'Перевод через десятичную систему',
      prompt: 'Прочитайте исходную запись по схеме Горнера. Затем переведите полученное число в основание ' + target + ' делением с остатком.',
      context: onPage(indexed(source, base) + ' → ?<sub>10</sub> → ?<sub>' + target + '</sub>'),
      parts: [
        text('Промежуточное число в десятичной системе', value),
        text('Запись в основании ' + target, result, 'record'),
      ],
      explanation: onPage(
        'По Горнеру получаем ' + first + ' · ' + base + ' + ' + second + ' = ' + prefix +
          ', затем ' + prefix + ' · ' + base + ' + ' + third + ' = ' + value + '.',
        divisions.join('<br>'),
        'Читаем остатки снизу вверх и получаем ' + indexed(result, target) + '.',
      ),
    });
  }

  {
    const base = pick(3, 12);
    const one = pick(1, base - 1);
    const other = pick(base - one, base - 1);
    const oneGroup = pick(1, base - 1);
    const largest = pick(1, base - 1);
    const addLeft = largest * base ** 2 + (base - 1 - oneGroup) * base + one;
    const addRight = oneGroup * base + other;
    const addResult = format(addLeft + addRight, base);
    const subTop = pick(1, base - 1);
    const subGroups = pick(1, base - 2);
    const subUnits = pick(1, base - 1);
    const subLeft = subTop * base ** 2;
    const subRight = subGroups * base + subUnits;
    const subResult = format(subLeft - subRight, base);
    tasks.push({
      title: 'Перенос и заём в целых записях',
      prompt: 'Выполните оба действия по разрядам. Запишите ответы в основании ' + base + '.',
      context: onPage('а) ' + calculate(format(addLeft, base), '+', format(addRight, base), base) +
        '<br>б) ' + calculate(format(subLeft, base), '−', format(subRight, base), base)),
      parts: [
        text('а) Сумма', addResult, 'record'),
        text('б) Разность', subResult, 'record'),
      ],
      explanation: onPage(
        'При сложении в единицах ' + one + ' + ' + other + ' = ' + (one + other) +
          '. Пишем ' + alphabet[one + other - base] + ' и переносим 1. В следующем разряде сумма с переносом равна ' +
          base + ', здесь пишем 0 и снова переносим 1. Сумма равна ' + indexed(addResult, base) + '.',
        'Для вычитания размениваем одну группу из разряда № 2. В разряде № 1 остаётся ' +
          (base - 1) + ' групп, а в единицах появляется ' + base + ' палочек. Вычитаем ' +
          subGroups + ' групп и ' + subUnits + ' единиц, получаем ' + indexed(subResult, base) + '.',
      ),
    });
  }

  {
    const base = pick(3, 8);
    const scale = base ** 2;
    const whole = pick(1, base - 1);
    const tenth = pick(1, base - 1);
    const addDigit = pick(base - tenth, base - 1);
    const tail = pick(1, base - 1);
    const addLeft = whole * scale + tenth * base;
    const addRight = pick(0, base - 1) * scale + addDigit * base + tail;
    const first = pick(1, base - 2);
    const second = pick(first + 1, base - 1);
    const subLeft = pick(1, base - 1) * scale + first;
    const subRight = second;
    const fraction = (value) => {
      const tail = format(value % scale, base).padStart(2, '0').replace(/0+$/, '');
      return format(Math.floor(value / scale), base) + (tail ? ',' + tail : '');
    };
    const marked = (left, operator, right) =>
      calculate('(' + fraction(left) + ')', operator, '(' + fraction(right) + ')', base);
    const addResult = fraction(addLeft + addRight);
    const subResult = fraction(subLeft - subRight);
    tasks.push({
      title: 'Сложение и вычитание чисел с запятой',
      prompt: 'Совместите запятые и выполните оба действия. Запишите ответы в основании ' + base +
        ' с запятой, без конечных нулей в дробной части.',
      context: onPage('а) ' + marked(addLeft, '+', addRight) + '<br>б) ' + marked(subLeft, '−', subRight)),
      parts: [
        text('а) Сумма', addResult, 'record'),
        text('б) Разность', subResult, 'record'),
      ],
      explanation: onPage(
        'В первом слагаемом дописываем ноль справа от дробной части для выравнивания. В первом разряде после запятой ' +
          tenth + ' + ' + addDigit + ' = ' + (tenth + addDigit) +
          ', поэтому переносим 1 в целую часть. Сумма равна ' + indexed(addResult, base) + '.',
        'При вычитании занимаем через нулевой разряд после запятой. В нём остаётся ' + (base - 1) +
          ', а во втором разряде после запятой получаем ' + first + ' + ' + base + ' − ' + second +
          ' = ' + (first + base - second) + '. Разность равна ' + indexed(subResult, base) + '.',
      ),
    });
  }

  {
    const base = pick(4, 9);
    const divisor = base - 1;
    const next = pick(0, 1);
    const factor = pick(1, 2);
    const fixed = factor * divisor - next;
    const first = pick(Math.max(1, fixed - divisor), Math.min(divisor, fixed - 1));
    const second = fixed - first;
    const digit = next === 0 ? 0 : divisor;
    const total = format(factor * divisor * base ** 2, base);
    tasks.push({
      title: 'Неизвестная цифра и два делителя',
      prompt: 'Символ x обозначает одну цифру. Сначала отметьте все значения x, при которых сумма кратна ' +
        divisor + '. Затем среди них найдите цифру, при которой та же сумма кратна и ' + base ** 2 +
        '. Для этой цифры вычислите сумму в исходном основании.',
      context: onPage(calculate(first + '<i>x</i>0', '+', '' + second + next + '0', base)),
      parts: [
        {
          label: 'Все значения x для первого делителя', kind: 'checkbox', points: 1,
          options: Array.from({length: base}, (_, value) => ({value: String(value), label: String(value)})),
          expected: ['0', String(divisor)], answer: '0 и ' + divisor,
        },
        text('Значение x при выполнении обоих условий', digit),
        text('Сумма в основании ' + base, total, 'record'),
      ],
      explanation: onPage(
        'Основание ' + base + ' даёт остаток 1 при делении на ' + divisor +
          '. Сумма значений цифр в обоих слагаемых равна ' + fixed + ' + ' + next + ' + x = ' +
          factor * divisor + ' + x. В допустимом диапазоне подходят 0 и ' + divisor + '.',
        'Для второго делителя ' + base + '<sup>2</sup> достаточно двух младших разрядов. Их вклад в сумму равен ' +
          base + ' · (x + ' + next + '). Он кратен ' + base ** 2 + ' только при x = ' + digit +
          ' из найденных вариантов. Сумма равна ' + indexed(total, base) + '.',
      ),
    });
  }

  {
    const base = pick(4, 8);
    const leading = pick(2, base - 1);
    const square = base ** 2;
    const limit = 2 * base + 2;
    const largest = 2 * base;
    const divisor = base + 1;
    const digits = [leading, 0, 0, 0, base - 1, base - 2, 0];
    const result = digits.map((digit) => alphabet[digit]).join('');
    tasks.push({
      title: 'Четыре нуля после вычитания',
      prompt: 'Найдите наибольшее целое x в указанном диапазоне, при котором запись результата в основании ' + base +
        ' содержит ровно четыре нуля. Для этого x запишите результат в исходном основании и найдите его остаток при делении на ' + divisor + '.',
      context: onPage(leading + ' · ' + square + '<sup>3</sup> + ' +
        base + '<sup>3</sup> − <i>x</i><br>1 ≤ <i>x</i> ≤ ' + limit),
      parts: [
        text('Наибольшее возможное x в десятичной системе', largest),
        text('Значение выражения в основании ' + base, result, 'record'),
        text('Остаток при делении на ' + divisor + ' в десятичной системе', leading + 1),
      ],
      explanation: onPage(
        square + '<sup>3</sup> = ' + base + '<sup>6</sup>. Поскольку 0 &lt; x &lt; ' + base +
          '<sup>2</sup>, вычитание затрагивает только разряды № 3 и младше. После займа в разряде № 3 стоит 0. ' +
          'В разряде № 2 остаётся ' + (base - 1) + ', а два младших разряда дают запись числа ' + base + '<sup>2</sup> − x.',
        'Разряды № 5, 4 и 3 нулевые. Так как x не больше ' + limit + ', число ' + base + '<sup>2</sup> − x ' +
          'не меньше ' + (square - limit) + ' и не меньше ' + base + '. Поэтому разряд № 1 остаётся ненулевым. ' +
          'Четвёртый ноль появляется в единицах, когда x кратно ' + base +
          '. В заданном диапазоне подходят ' + base + ' и ' + largest + '. Берём большее значение и получаем ' + indexed(result, base) + '.',
        'По модулю ' + divisor + ' основание заменяем на −1. Чередуем знаки от правой цифры. Ненулевые вклады дают ' +
          leading + ' + ' + (base - 1) + ' − ' + (base - 2) + ' = ' + (leading + 1) + '. Это и есть остаток.',
      ),
    });
  }

  {
    const mode = pick(0, 2);
    const current = pick(6, 23);
    const later = mode === 0
      ? pick(0, 5)
      : mode === 1
      ? 6 * (Math.floor(current / 6) + 1) + pick(0, 2)
      : pick(current + 1, current + 10);
    const difference = Math.abs(later - current);
    const direction = later > current ? 'дальше' : 'раньше';
    const stepName = {one: 'позицию', few: 'позиции', many: 'позиций'}[plural.select(difference)];
    const [currentFirst, currentLast] = toPlaces(current, [6, 6]);
    const [laterFirst, laterLast] = toPlaces(later, [6, 6]);
    tasks.push({
      title: 'Индекс и номер слова',
      prompt: 'Все двубуквенные слова уже расположены по порядку данного алфавита. Повторы разрешены, в начале может стоять Е. Найдите порядковый номер исходного слова и слово на ' +
        difference + ' ' + stepName + ' ' + direction + '. Нумерация списка начинается с 1.',
      context: onPage('Алфавит <b>' + letters.join(', ') + '</b>. Исходное слово <b>' + word(current) + '</b>.'),
      parts: [
        text('Порядковый номер исходного слова', current + 1),
        text('Слово после сдвига', word(later), 'record'),
      ],
      explanation: onPage(
        'Значения букв исходного слова равны ' + currentFirst + ' и ' + currentLast + '. По Горнеру индекс равен ' +
          currentFirst + ' · 6 + ' + currentLast + ' = ' + current + '. Порядковый номер равен ' + (current + 1) + '.',
        'После сдвига индекс равен ' + current + (later > current ? ' + ' : ' − ') + difference +
          ' = ' + later + '. Разложение ' + later + ' = ' + laterFirst + ' · 6 + ' + laterLast +
          ' даёт две цифры. Сохраняем обе позиции и заменяем цифры буквами. Получаем <b>' + word(later) + '</b>.',
      ),
    });
  }

  {
    const frames = pick(3, 5);
    const rows = pick(3, 5);
    const columns = pick(4, 6);
    const frame = pick(0, frames - 2);
    const row = rows - 1;
    const column = pick(columns - 2, columns - 1);
    const withinFrame = pick(0, Math.min(10, rows * columns - 1));
    const shift = columns - column + withinFrame;
    const value = (frame * rows + row) * columns + column;
    const result = value + shift;
    const bases = [frames, rows, columns];
    const shiftPlaces = toPlaces(shift, bases);
    const resultPlaces = toPlaces(result, bases);
    const maximum = frames * rows * columns - 1;
    const boundary = pick(result + 1, maximum);
    const count = boundary - result - 1;
    const nextGroups = Math.floor(result / columns);
    tasks.push({
      title: 'Шаг по пикселям и открытые границы',
      prompt: 'Сначала идут все столбцы одной строки, затем следующие строки кадра, затем кадры. Координаты и общий индекс начинаются с нуля. Найдите общий индекс исходного пикселя. После сдвига запишите новые координаты в порядке «кадр, строка, столбец». Посчитайте, сколько индексов лежат строго между индексом пикселя после сдвига и заданной границей.',
      context: onPage('Кадров <b>' + frames + '</b>, строк в кадре <b>' + rows + '</b>, столбцов в строке <b>' +
        columns + '</b>.<br>Исходные координаты <b>' + tuple([frame, row, column]) + '</b>, шаг вперёд <b>' + shift +
        '</b>.<br>Граница для подсчёта <b>' + boundary + '</b>.'),
      parts: [
        text('Общий индекс исходного пикселя', value),
        text('Координаты после шага', tuple(resultPlaces), 'tuple'),
        text('Количество пикселей строго между границами', count),
      ],
      explanation: onPage(
        'По Горнеру индекс равен (' + frame + ' · ' + rows + ' + ' + row + ') · ' + columns + ' + ' + column +
          ' = ' + value + '. Шаг ' + shift + ' раскладывается как ' + shiftPlaces[0] + ' · ' + rows * columns +
          ' + ' + shiftPlaces[1] + ' · ' + columns + ' + ' + shiftPlaces[2] + ', то есть ' + tuple(shiftPlaces) + '.',
        'После шага индекс равен ' + value + ' + ' + shift + ' = ' + result + '. Делим на основание справа, получаем ' +
          result + ' = ' + nextGroups + ' · ' + columns + ' + ' + resultPlaces[2] + ' и ' +
          nextGroups + ' = ' + resultPlaces[0] + ' · ' + rows + ' + ' + resultPlaces[1] + '. Координаты равны ' +
          tuple(resultPlaces) + '.',
        'Обе границы исключены. ' + (count === 0
          ? 'Индексы ' + result + ' и ' + boundary + ' соседние, поэтому между ними 0 пикселей.'
          : 'Считаем индексы от ' + (result + 1) + ' до ' + (boundary - 1) + ' включительно. Получаем ' +
            boundary + ' − ' + result + ' − 1 = ' + count + '.'),
      ),
    });
  }

  return tasks;
}

const assessmentConfig = {
  id: "kontrolnaya",
  title: "Итоговая контрольная работа",
  max: 20,
  makeTasks: makeFinalBookTasks,
};
