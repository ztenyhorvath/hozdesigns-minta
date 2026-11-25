(function(){
  var b=document.querySelector('.burger'),m=document.getElementById('menu');
  if(b&&m){
    b.addEventListener('click',function(){var o=m.classList.toggle('open');b.setAttribute('aria-expanded',o)});
    m.addEventListener('click',function(e){if(e.target.tagName==='A'){m.classList.remove('open');b.setAttribute('aria-expanded',false)}});
  }

  // asztalfoglalás (bemutató: nem küld el semmit)
  var f=document.getElementById('foglalas');
  if(f){
    var d=f.querySelector('[name=datum]');
    if(d){var t=new Date();d.min=t.toISOString().slice(0,10);if(!d.value)d.value=d.min;}
    f.querySelectorAll('.chips').forEach(function(g){
      var inp=f.querySelector('[name='+g.dataset.for+']');
      g.addEventListener('click',function(e){
        var x=e.target.closest('button');if(!x)return;
        g.querySelectorAll('button').forEach(function(y){y.setAttribute('aria-pressed',y===x)});
        inp.value=x.dataset.v;
      });
    });
    f.addEventListener('submit',function(e){
      e.preventDefault();
      if(!f.reportValidity())return;
      var fo=f.querySelector('[name=fo]').value,dt=new Date(f.querySelector('[name=datum]').value+'T12:00'),ido=f.querySelector('[name=ido]').value;
      var nap=dt.toLocaleDateString('hu-HU',{month:'long',day:'numeric',weekday:'long'});
      f.querySelector('.sum').textContent=fo+' főre, '+nap+', '+ido+'.';
      f.classList.add('sent');
      f.scrollIntoView({behavior:'smooth',block:'center'});
    });
  }

  // galéria nagyítás
  var lb=document.querySelector('.lb');
  if(lb){
    var btns=[].slice.call(document.querySelectorAll('.gal .grid button')),img=lb.querySelector('img'),i=0;
    function show(k){i=(k+btns.length)%btns.length;var s=btns[i].querySelector('img');img.src=s.src;img.alt=s.alt;}
    btns.forEach(function(x,k){x.addEventListener('click',function(){show(k);lb.classList.add('on');lb.querySelector('.x').focus()})});
    lb.querySelector('.x').onclick=function(){lb.classList.remove('on');btns[i].focus()};
    lb.querySelector('.pv').onclick=function(){show(i-1)};
    lb.querySelector('.nx').onclick=function(){show(i+1)};
    lb.addEventListener('click',function(e){if(e.target===lb)lb.classList.remove('on')});
    document.addEventListener('keydown',function(e){if(!lb.classList.contains('on'))return;
      if(e.key==='Escape')lb.classList.remove('on');if(e.key==='ArrowLeft')show(i-1);if(e.key==='ArrowRight')show(i+1);});
  }
})();
