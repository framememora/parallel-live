import type { CommentTemplate } from './types';

/**
 * Template bank: ~20-25 hand-written templates per persona. Raw template count
 * is deliberately kept moderate — the real source of variety is the slot pools
 * (see slotPools.ts), since every template with N slots each drawn from a pool
 * of size M renders as up to M^N distinct strings. 8 personas x ~20 templates
 * x pools of 15-60 items per slot already yields effectively unlimited unique
 * comments; commentScheduler's cooldown/anti-repeat logic handles the rest.
 */

let nextId = 0;
function t(
  persona: CommentTemplate['persona'],
  text: string,
  slots: CommentTemplate['slots'],
  extra: Partial<Pick<CommentTemplate, 'weight' | 'minSessionSecond' | 'maxSessionSecond' | 'requiresMilestone'>> = {}
): CommentTemplate {
  nextId += 1;
  return {
    id: `${persona}-${nextId}`,
    persona,
    text,
    slots,
    weight: extra.weight ?? 1,
    minSessionSecond: extra.minSessionSecond,
    maxSessionSecond: extra.maxSessionSecond,
    requiresMilestone: extra.requiresMilestone,
  };
}

const hypeBro: CommentTemplate[] = [
  t('hypeBro', "LET'S GOOOO {emoji}", ['emoji']),
  t('hypeBro', '{name} ate that up fr {emoji}', ['name', 'emoji']),
  t('hypeBro', 'NO CAP this is the best live today {emoji}', ['emoji']),
  t('hypeBro', 'run it back run it back {emoji}', ['emoji']),
  t('hypeBro', 'we are NOT ready for this energy {emoji}', ['emoji']),
  t('hypeBro', 'bro is UNDEFEATED {emoji}', ['emoji']),
  t('hypeBro', '{count} watching and counting, let’s get it up {emoji}', ['count', 'emoji']),
  t('hypeBro', 'this is going straight to the group chat {emoji}', ['emoji']),
  t('hypeBro', 'certified banger of a live {emoji}', ['emoji']),
  t('hypeBro', 'everybody tell a friend RIGHT NOW {emoji}', ['emoji']),
  t('hypeBro', '{name} you better not end this early {emoji}', ['name', 'emoji']),
  t('hypeBro', 'this the moment we tell people about later {emoji}', ['emoji']),
  t('hypeBro', 'absolutely cooking rn {emoji}', ['emoji']),
  t('hypeBro', 'the algorithm did something right for once {emoji}', ['emoji']),
  t('hypeBro', 'W live, no notes {emoji}', ['emoji']),
  t('hypeBro', 'go off {name} {emoji}', ['name', 'emoji']),
  t('hypeBro', 'this energy should be illegal {emoji}', ['emoji']),
  t('hypeBro', 'we eating good today {emoji}', ['emoji']),
  t('hypeBro', 'undefeated season continues {emoji}', ['emoji']),
  t('hypeBro', 'and THAT’S on periodt {emoji}', ['emoji']),
  t('hypeBro', 'we just hit {count}, insane {emoji}', ['count', 'emoji'], { requiresMilestone: 'viewerSpike', weight: 2 }),
];

const skeptic: CommentTemplate[] = [
  t('skeptic', 'ok but is this actually live {emoji}', ['emoji']),
  t('skeptic', 'the lighting is kinda suspicious ngl {emoji}', ['emoji']),
  t('skeptic', 'wait how did we get to {count} that fast {emoji}', ['count', 'emoji']),
  t('skeptic', 'not me questioning everything rn {emoji}', ['emoji']),
  t('skeptic', 'hm {emoji}', ['emoji']),
  t('skeptic', 'this feels a little staged but ok {emoji}', ['emoji']),
  t('skeptic', 'genuinely can’t tell if this is scripted {emoji}', ['emoji']),
  t('skeptic', 'somebody explain the math on {count} viewers rn', ['count']),
  t('skeptic', 'I’ll believe it when I see it {emoji}', ['emoji']),
  t('skeptic', 'watching with one eyebrow raised {emoji}', ['emoji']),
  t('skeptic', 'not saying it’s fake, just saying {emoji}', ['emoji']),
  t('skeptic', 'the comments are moving weird fast {emoji}', ['emoji']),
  t('skeptic', 'proof or it didn’t happen {emoji}', ['emoji']),
  t('skeptic', '{name} explain yourself {emoji}', ['name', 'emoji']),
  t('skeptic', 'sus but I’m still watching {emoji}', ['emoji']),
  t('skeptic', 'this is either genius or completely fake {emoji}', ['emoji']),
  t('skeptic', 'somebody fact check this live {emoji}', ['emoji']),
  t('skeptic', 'the vibes are immaculate but the numbers are wild', []),
  t('skeptic', 'not the {count} viewers out of nowhere {emoji}', ['count', 'emoji'], { requiresMilestone: 'viewerSpike' }),
];

const emojiSpammer: CommentTemplate[] = [
  t('emojiSpammer', '{emoji}{emoji}{emoji}{emoji}', ['emoji', 'emoji', 'emoji', 'emoji']),
  t('emojiSpammer', '{emoji}{emoji}', ['emoji', 'emoji']),
  t('emojiSpammer', '{emoji}{emoji}{emoji}', ['emoji', 'emoji', 'emoji']),
  t('emojiSpammer', '{name} {emoji}{emoji}{emoji}', ['name', 'emoji', 'emoji', 'emoji']),
  t('emojiSpammer', '{emoji}{emoji}{emoji}{emoji}{emoji}', ['emoji', 'emoji', 'emoji', 'emoji', 'emoji']),
  t('emojiSpammer', 'YESSS {emoji}{emoji}', ['emoji', 'emoji']),
  t('emojiSpammer', '{emoji} {emoji} {emoji}', ['emoji', 'emoji', 'emoji']),
  t('emojiSpammer', '{count}?!?! {emoji}{emoji}', ['count', 'emoji', 'emoji'], { requiresMilestone: 'viewerSpike' }),
  t('emojiSpammer', '{emoji}', ['emoji'], { weight: 0.6 }),
  t('emojiSpammer', 'omggg {emoji}{emoji}{emoji}', ['emoji', 'emoji', 'emoji'], { requiresMilestone: 'heartBurst' }),
  t('emojiSpammer', '{emoji}{emoji}{emoji}{emoji}{emoji}{emoji}', ['emoji', 'emoji', 'emoji', 'emoji', 'emoji', 'emoji']),
];

const newbie: CommentTemplate[] = [
  t('newbie', 'wait what app is this even {emoji}', ['emoji']),
  t('newbie', '{timePhrase}, what’d I miss', ['timePhrase']),
  t('newbie', 'first time here, this is cool {emoji}', ['emoji']),
  t('newbie', 'how does this work exactly', []),
  t('newbie', 'is this normal for this account {emoji}', ['emoji']),
  t('newbie', 'new here, hi everyone {emoji}', ['emoji']),
  t('newbie', 'wait {count} people are watching this??', ['count']),
  t('newbie', '{question}', ['question']),
  t('newbie', 'ok I’m staying for this one {emoji}', ['emoji']),
  t('newbie', 'never seen a live like this before {emoji}', ['emoji']),
  t('newbie', 'someone catch me up please', []),
  t('newbie', 'this popped up outta nowhere but I’m into it {emoji}', ['emoji']),
  t('newbie', 'wait is {name} always like this {emoji}', ['name', 'emoji']),
  t('newbie', 'ok this is actually kind of addictive {emoji}', ['emoji']),
  t('newbie', 'my first comment ever on a live lol {emoji}', ['emoji']),
];

const oldFan: CommentTemplate[] = [
  t('oldFan', 'been here since day one, still not disappointed {emoji}', ['emoji']),
  t('oldFan', 'still here, not going anywhere {emoji}', ['emoji'], { minSessionSecond: 90 }),
  t('oldFan', '{name} always delivers {emoji}', ['name', 'emoji']),
  t('oldFan', 'told my friends about this account months ago, feels good {emoji}', ['emoji']),
  t('oldFan', 'og fans know this is nothing new {emoji}', ['emoji']),
  t('oldFan', 'we watched you grow into this {emoji}', ['emoji'], { minSessionSecond: 60 }),
  t('oldFan', 'remember when it was just like 10 of us watching {emoji}', ['emoji']),
  t('oldFan', 'consistency is why we stayed {emoji}', ['emoji']),
  t('oldFan', 'this account never misses honestly {emoji}', ['emoji']),
  t('oldFan', 'been watching every live since the start {emoji}', ['emoji']),
  t('oldFan', '{name}, proud of how far this has come {emoji}', ['name', 'emoji']),
  t('oldFan', 'day one supporter checking in {emoji}', ['emoji']),
  t('oldFan', 'still can’t believe how big this got {emoji}', ['emoji'], { requiresMilestone: 'viewerSpike' }),
  t('oldFan', 'loyalty gang where you at {emoji}', ['emoji']),
];

const flirty: CommentTemplate[] = [
  t('flirty', '{compliment} {emoji}', ['compliment', 'emoji']),
  t('flirty', 'ok but why do you look like that today {emoji}', ['emoji']),
  t('flirty', '{name} stop it {emoji}', ['name', 'emoji']),
  t('flirty', 'not me staying for the whole live because of this {emoji}', ['emoji']),
  t('flirty', 'you’re so charming it’s unfair {emoji}', ['emoji']),
  t('flirty', 'ok i see you {emoji}', ['emoji']),
  t('flirty', 'this smile should be studied {emoji}', ['emoji']),
  t('flirty', 'the confidence is so attractive ngl {emoji}', ['emoji']),
  t('flirty', 'why is nobody talking about how good this looks {emoji}', ['emoji']),
  t('flirty', '{compliment}, just saying {emoji}', ['compliment', 'emoji']),
  t('flirty', 'ok that was too smooth {emoji}', ['emoji']),
  t('flirty', 'you’re gonna give someone a heart attack with that {emoji}', ['emoji']),
];

const confused: CommentTemplate[] = [
  t('confused', 'wait what’s happening {emoji}', ['emoji']),
  t('confused', 'I’m lost but I’ll stay {emoji}', ['emoji']),
  t('confused', 'did I miss something {emoji}', ['emoji']),
  t('confused', 'why is everyone saying that', []),
  t('confused', 'ok wait rewind {emoji}', ['emoji']),
  t('confused', 'somebody explain {emoji}', ['emoji']),
  t('confused', 'huh {emoji}', ['emoji']),
  t('confused', 'wait {count}?? how', ['count']),
  t('confused', 'I don’t get it but I’m still watching {emoji}', ['emoji']),
  t('confused', 'is this a bit or is this real {emoji}', ['emoji']),
  t('confused', 'my brain hurts trying to keep up {emoji}', ['emoji']),
  t('confused', 'wait go back go back {emoji}', ['emoji']),
];

const supportive: CommentTemplate[] = [
  t('supportive', 'you’re doing amazing {emoji}', ['emoji']),
  t('supportive', 'proud of you {emoji}', ['emoji']),
  t('supportive', 'keep going, this is great {emoji}', ['emoji']),
  t('supportive', '{name} you got this {emoji}', ['name', 'emoji']),
  t('supportive', 'sending good energy your way {emoji}', ['emoji']),
  t('supportive', 'this made my day honestly {emoji}', ['emoji']),
  t('supportive', 'take your time, we’re not going anywhere {emoji}', ['emoji']),
  t('supportive', 'so happy you’re doing this {emoji}', ['emoji']),
  t('supportive', 'you deserve every bit of this {emoji}', ['emoji'], { requiresMilestone: 'viewerSpike' }),
  t('supportive', 'rooting for you always {emoji}', ['emoji']),
  t('supportive', 'this is such a safe space to watch {emoji}', ['emoji']),
  t('supportive', 'no pressure, just enjoy it {emoji}', ['emoji']),
  t('supportive', 'we appreciate you {emoji}', ['emoji']),
  t('supportive', 'the hearts are flying because you earned it {emoji}', ['emoji'], { requiresMilestone: 'heartBurst' }),
];

export const COMMENT_TEMPLATES: readonly CommentTemplate[] = [
  ...hypeBro,
  ...skeptic,
  ...emojiSpammer,
  ...newbie,
  ...oldFan,
  ...flirty,
  ...confused,
  ...supportive,
];
