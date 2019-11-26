# nimbus

A discord powered stock market game for [Codeforces](http://codeforces.com/). 

## Values

Each stock (or profile's) value is calculated according to the following formula. 

```
1.2 ^ rank * rating
```

Where `rank` is equal to the number of ranks above `Newbie`. For example, an `expert` would have a rank equal to 3. 
