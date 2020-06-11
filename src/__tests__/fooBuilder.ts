import { describe, expect, it } from '@jest/globals';

import { FluentBuilder, ProxiedBuilder, ArrayBuilder } from 'src';

interface HumanName {
    given: string[];
    family: string;
}

interface Address {
    kind: 'Home' | 'Postal';
    line: string;
    city: string;
    postcode: string;
    state: string;
    country: string;
}

interface Person {
    name: HumanName;
    address: Address[];
    age: number;
    gender: string;
}

class AddressBuilder extends FluentBuilder<Address> {
    protected getInitial(): Address {
        return {
            kind: 'Home',
            line: '1234 Fake Ave',
            city: 'Adelaide',
            country: 'Australia',
            state: 'South Australia',
            postcode: '5000',
        };
    }
    public static Create(): AddressBuilder {
        return new AddressBuilder();
    }

    public ofKind(kind: 'Home' | 'Postal'): AddressBuilder {
        return new AddressBuilder({ kind }, this);
    }

    public atLine(line: string): AddressBuilder {
        return new AddressBuilder({ line }, this);
    }

    public inCity(city: string): AddressBuilder {
        return new AddressBuilder({ city }, this);
    }

    public inState(state: string): AddressBuilder {
        return new AddressBuilder({ state }, this);
    }

    public inCountry(country: string): AddressBuilder {
        return new AddressBuilder({ country }, this);
    }

    public inPostcode(postcode: string): AddressBuilder {
        return new AddressBuilder({ postcode }, this);
    }
}

class HumanNameBuilder extends FluentBuilder<HumanName> {
    public static Create(name?: HumanName): HumanNameBuilder {
        return new HumanNameBuilder(name);
    }

    protected getInitial(): HumanName {
        return {
            given: ['Bob'],
            family: 'Smith',
        };
    }

    public withGiven(...given: /*?*/ string[]): HumanNameBuilder {
        return new HumanNameBuilder({ given }, this);
    }

    public withFamily(family: string): HumanNameBuilder {
        return new HumanNameBuilder({ family }, this);
    }
}

class PersonBuilder extends FluentBuilder<Person> {
    public static Create(): PersonBuilder {
        return new PersonBuilder();
    }

    protected getInitial(): Person {
        return {
            name: { given: ['Bob'], family: 'Smith' },
            address: [],
            age: 45,
            gender: 'Female',
        };
    }

    public get age(): number {
        return this.current.age;
    }

    public get name(): HumanName {
        return this.current.name;
    }

    public named(): ProxiedBuilder<PersonBuilder, HumanNameBuilder> {
        return this.withBuilderProxy(
            'name',
            HumanNameBuilder.Create(this.name),
            (name) => new PersonBuilder({ name }, this),
        );
    }

    public addressed(): ArrayBuilder<PersonBuilder, AddressBuilder> {
        return this.withArrayProxy('address', AddressBuilder, (address) => new PersonBuilder({ address }, this));
    }

    public aged(age: number): PersonBuilder {
        return new PersonBuilder({ age }, this);
    }

    public gendered(gender: string): PersonBuilder {
        return new PersonBuilder({ gender }, this);
    }
}

describe('PersonBuilder', () => {
    it('should create a builder', () => {
        expect(PersonBuilder.Create()).toBeInstanceOf(FluentBuilder);
    });

    it('should create the default object', () => {
        expect(PersonBuilder.Create().build()).toEqual({
            name: { given: ['Bob'], family: 'Smith' },
            address: [],
            age: 45,
            gender: 'Female',
        });
    });

    it('should accept field update', () => {
        expect(PersonBuilder.Create().aged(12).build()).toEqual({
            name: { given: ['Bob'], family: 'Smith' },
            address: [],
            age: 12,
            gender: 'Female',
        });
    });

    it('should handle behave imutably', () => {
        const builder = PersonBuilder.Create();

        const builder2 = builder.aged(12);

        expect(builder).not.toBe(builder2);
    });

    it('should accept multiple updates', () => {
        expect(PersonBuilder.Create().aged(12).gendered('Male').build()).toEqual({
            name: { given: ['Bob'], family: 'Smith' },
            address: [],
            age: 12,
            gender: 'Male',
        });
    });

    it('should accept sub-builder chains', () => {
        const obj = PersonBuilder.Create()
            .aged(12)
            .named()
                .withGiven('Sam')
                .withFamily('Adams')
                .return()
            .gendered('Other')
            .build();

        expect(obj.name).toEqual({ given: ['Sam'], family: 'Adams' });
        expect(obj.gender).toBe('Other');
        expect(obj.age).toBe(12);
    });

    it('should accept sub-array chains', () => {
        const obj = PersonBuilder.Create()
            .aged(12)
            .addressed()
                .add()
                    .atLine('1 Foo St')
                    .inCity('Bing')
                    .inState('Baz')
                    .return()
                .add()
                    .ofKind('Postal')
                    .atLine('54 FizBuzz Way')
                    .inCity('Fiz')
                    .inState('Buzz')
                    .return()
            .return()
            .gendered('Other')
            .build();

        expect(obj.address).toEqual([
            {
                kind: 'Home',
                line: '1 Foo St',
                city: 'Bing',
                state: 'Baz',
                country: 'Australia',
                postcode: '5000',
            },
            {
                kind: 'Postal',
                line: '54 FizBuzz Way',
                city: 'Fiz',
                state: 'Buzz',
                country: 'Australia',
                postcode: '5000',
            },
        ]);

        expect(obj.gender).toBe('Other');
        expect(obj.age).toBe(12);
    });
});
