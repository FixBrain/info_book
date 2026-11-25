function makeThirdBlockTasks(random) {
  const pick = (min, max) => min + Math.floor(random() * (max - min + 1));
  const choose = (values) => values[pick(0, values.length - 1)];
  const textPart = (label, expected, normalization = 'integer', answer = String(expected)) => ({
    kind: 'text',
    label,
    expected: String(expected),
    normalization,
    points: 1,
    answer,
  });
  const tupleLabel = (values) => `(${values.join(', ')})`;
  const tuplePart = (label, values) => textPart(label, values.join(','), 'tuple', tupleLabel(values));
  const decode = (digits, bases) => digits.reduce((value, digit, index) => value * bases[index] + digit, 0);
  const decodeWord = (digits, alphabets) => digits.map((digit, i) => alphabets[i][digit]).join('');
  const formatTime = ([hours, minutes, seconds]) => [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0')).join(':');

  function encode(number, bases) {
    const digits = [];
    const steps = [];
    let rest = number;
    for (const base of bases.slice().reverse()) {
      const digit = rest % base;
      const quotient = (rest - digit) / base;
      steps.push(`${rest} = ${quotient} · ${base} + ${digit}`);
      digits.unshift(digit);
      rest = quotient;
    }
    return { digits, steps, overflow: rest };
  }

  function addColumns(left, right, bases) {
    const digits = [];
    const steps = [];
    let carry = 0;
    for (let i = bases.length - 1; i >= 0; i--) {
      const sum = left[i] + right[i] + carry;
      const digit = sum % bases[i];
      const outgoing = (sum - digit) / bases[i];
      steps.push(`${left[i]} + ${right[i]} + ${carry} = ${outgoing} · ${bases[i]} + ${digit}`);
      digits.unshift(digit);
      carry = outgoing;
    }
    return { digits, steps, carry };
  }

  const tasks = [];

  {
    const [source, alphabet] = choose([
      ['МОЛОКО', 'КЛМО'],
      ['КАСКА', 'АКС'],
      ['ПАЛАТА', 'АЛПТ'],
      ['КОРОНА', 'АКНОР'],
      ['КАРЕТА', 'АЕКРТ'],
    ]);
    const base = alphabet.length;
    const digits = [pick(1, base - 1), pick(0, base - 1)];
    const entry = decodeWord(digits, [alphabet, alphabet]);
    const value = decode(digits, [base, base]);
    tasks.push({
      title: 'Алфавит и значение записи',
      prompt: `Выпишите все буквы слова «${source}» по одному разу и расположите их по русскому алфавиту. Первая буква обозначает 0, следующая — 1 и так далее. Запишите получившийся алфавит и найдите десятичное значение записи «${entry}».`,
      parts: [
        textPart('Алфавит по порядку', alphabet, 'alphabet', Array.from(alphabet).join(', ')),
        textPart('Десятичное значение записи', value),
      ],
      explanation: `После удаления повторов и упорядочивания получаем ${Array.from(alphabet).join(', ')}. Основание равно ${base}. В записи ${entry} цифры имеют значения ${digits.join(' и ')}. По весам разрядов получаем ${digits[0]} · ${base} + ${digits[1]} = ${value}.`,
    });
  }

  {
    const alphabet = 'ЕЛНОСЦ';
    const digits = [pick(0, 2), pick(1, 5), pick(0, 5)];
    const bases = [6, 6, 6];
    const index = decode(digits, bases);
    const word = decodeWord(digits, [alphabet, alphabet, alphabet]);
    tasks.push({
      title: 'Индекс и номер слова',
      prompt: `В полном списке трёхбуквенных слов буквы могут повторяться. Порядок букв Е, Л, Н, О, С, Ц, их значения от 0 до 5. Начальная Е допустима. Найдите по схеме Горнера индекс слова ${word}, затем его порядковый номер.`,
      parts: [
        textPart('Индекс с нуля', index),
        textPart('Порядковый номер с единицы', index + 1),
      ],
      explanation: `Буквам ${word} соответствуют цифры ${tupleLabel(digits)}. По схеме Горнера индекс равен (${digits[0]} · 6 + ${digits[1]}) · 6 + ${digits[2]} = ${index}. Перед этим словом ${index} слов. Его порядковый номер ${index} + 1 = ${index + 1}.`,
    });
  }

  {
    const bases = choose([[3, 2, 5], [2, 5, 3], [4, 3, 2], [3, 4, 5]]);
    const size = bases.reduce((value, base) => value * base, 1);
    const index = pick(bases[1] * bases[2], size - 2);
    const { digits, steps } = encode(index, bases);
    tasks.push({
      title: 'Цифры и граница смешанной записи',
      prompt: `Основания трёх позиций слева направо равны ${tupleLabel(bases)}. Делением с остатком восстановите запись числа ${index}. Какой наибольший индекс вмещается в эти три позиции, если индексы начинаются с нуля?`,
      parts: [
        tuplePart('Три цифры слева направо, через запятую', digits),
        textPart('Наибольший индекс', size - 1),
      ],
      explanation: `<p>Делим на основания справа налево.<br>${steps.join('<br>')}</p>
        <p>Читаем остатки в обратном порядке и получаем ${tupleLabel(digits)}.</p>
        <p>Допустимых записей ${bases.join(' · ')} = ${size}, поэтому индексы идут от 0 до ${size - 1}.</p>`,
    });
  }

  {
    const alphabets = ['ВКНСТ', 'АВИКНСТ', 'АВИКНСТ', 'АИ'];
    const bases = alphabets.map((alphabet) => alphabet.length);
    const digits = [pick(1, 3), pick(5, 6), pick(3, 6), 1];
    const word = decodeWord(digits, alphabets);
    const shift = 2 * pick(5, 6) + 1 + 14 * pick(0, 1);
    const encoded = encode(shift, bases).digits;
    const addition = addColumns(digits, encoded, bases);
    const result = decodeWord(addition.digits, alphabets);
    const index = decode(addition.digits, bases);
    const [a, b, c, d] = addition.digits;
    tasks.push({
      title: 'Сдвиг в списке со смешанным основанием',
      prompt: `Слова отсортированы по спискам букв для каждой позиции. Буквы могут повторяться. В каждом списке первая буква имеет значение 0. Запишите сдвиг ${shift} в четырёх разрядах и прибавьте его к записи слова ${word}. Найдите получившееся слово и его номер.`,
      context: '<p>Первая позиция — В, К, Н, С, Т</p><p>Вторая и третья позиции — А, В, И, К, Н, С, Т</p><p>Четвёртая позиция — А, И</p>',
      parts: [
        tuplePart('Сдвиг в четырёх разрядах слева направо', encoded),
        textPart('Получившееся слово', result, 'record'),
        textPart('Порядковый номер с единицы', index + 1),
      ],
      explanation: `<p>Слову ${word} соответствует ${tupleLabel(digits)}, сдвигу ${shift} — ${tupleLabel(encoded)}.</p>
        <p>Складываем справа налево. Справа от знака равенства показаны перенос, умноженный на основание, и цифра разряда.<br>${addition.steps.join('<br>')}</p>
        <p>Сумма ${tupleLabel(addition.digits)} соответствует слову ${result}. По Горнеру индекс равен ((${a} · 7 + ${b}) · 7 + ${c}) · 2 + ${d} = ${index}. Номер равен ${index + 1}.</p>`,
    });
  }

  {
    const [frames, height, width] = choose([[2, 4, 5], [3, 3, 4], [3, 4, 5], [2, 3, 5]]);
    const bases = [frames, height, width];
    const frame = pick(0, frames - 2);
    const origin = [frame, height - 1, width - pick(1, 2)];
    const index = decode(origin, bases);
    const shift = pick(2, width + 1);
    const target = index + shift;
    const { digits, steps } = encode(target, bases);
    const edge = frames * height * width - 1;
    tasks.push({
      title: 'Линейный индекс пикселя',
      prompt: `Размеры массива в порядке «кадры, строки, столбцы» равны ${tupleLabel(bases)}. Сначала перебираются столбцы, затем строки, затем кадры. Все номера начинаются с 0. У пикселя координаты ${tupleLabel(origin)} в порядке «кадр, строка, столбец». Найдите его индекс и координаты через ${shift} позиций вперёд. Какой максимальный дополнительный сдвиг от нового пикселя ещё оставит нас в списке?`,
      parts: [
        textPart('Исходный линейный индекс', index),
        tuplePart('Координаты после сдвига в порядке «кадр, строка, столбец»', digits),
        textPart('Максимальный дополнительный сдвиг', edge - target),
      ],
      explanation: `<p>Исходный индекс равен (${origin[0]} · ${height} + ${origin[1]}) · ${width} + ${origin[2]} = ${index}. После сдвига индекс равен ${index} + ${shift} = ${target}.</p>
        <p>Восстанавливаем координаты справа налево.<br>${steps.join('<br>')}</p>
        <p>Получаем ${tupleLabel(digits)}. Последний индекс равен ${frames} · ${height} · ${width} − 1 = ${edge}. Разность ${edge} − ${target} = ${edge - target} даёт максимальный дополнительный сдвиг.</p>`,
    });
  }

  {
    const start = [23, 59, pick(45, 58)];
    const offset = pick(65, 100);
    const bases = [24, 60, 60];
    const encoded = encode(offset, bases).digits;
    const addition = addColumns(start, encoded, bases);
    const result = formatTime(addition.digits);
    tasks.push({
      title: 'Перенос через полночь',
      prompt: `Часы показывают ${formatTime(start)}. Представьте ${offset} секунд как часы, минуты и секунды, затем определите показание часов после этого сдвига. Время запишите в формате ЧЧ:ММ:СС.`,
      parts: [
        tuplePart('Сдвиг в порядке «часы, минуты, секунды»', encoded),
        textPart('Показание часов в формате ЧЧ:ММ:СС', result, 'literal'),
      ],
      explanation: `<p>${offset} = ${encoded[1]} · 60 + ${encoded[2]}, поэтому сдвиг равен ${tupleLabel(encoded)}.</p>
        <p>Складываем секунды, минуты и часы.<br>${addition.steps.join('<br>')}</p>
        <p>Перенос из часов даёт следующие сутки. Показание часов — ${result}.</p>`,
    });
  }

  return tasks;
}

const assessmentConfig = {
  id: "proverka-3",
  title: "Самостоятельная работа. Слова, часы и пиксели",
  max: 14,
  makeTasks: makeThirdBlockTasks,
};
